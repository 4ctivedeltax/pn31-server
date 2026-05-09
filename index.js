const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = '9936071044';
const DATASTORE_NAME = 'Comptes';
const BASE = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores`;

// Helper : lire une entrée
async function dsGet(key) {
    const res = await fetch(`${BASE}/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${key}`, {
        headers: { 'x-api-key': ROBLOX_API_KEY }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// Helper : écrire une entrée
async function dsSet(key, value) {
    const body = JSON.stringify(value);
    const res = await fetch(`${BASE}/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${key}`, {
        method: 'POST',
        headers: {
            'x-api-key': ROBLOX_API_KEY,
            'content-type': 'application/json',
            'content-md5': Buffer.from(body).toString('base64')
        },
        body
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
}

// Helper : supprimer une entrée
async function dsDelete(key) {
    const res = await fetch(`${BASE}/datastore/entries/entry?datastoreName=${DATASTORE_NAME}&entryKey=${key}`, {
        method: 'DELETE',
        headers: { 'x-api-key': ROBLOX_API_KEY }
    });
    if (!res.ok && res.status !== 404) throw new Error(await res.text());
    return true;
}

// Helper : lister toutes les clés
async function dsList() {
    const res = await fetch(`${BASE}/datastore/entries?datastoreName=${DATASTORE_NAME}&limit=100`, {
        headers: { 'x-api-key': ROBLOX_API_KEY }
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.keys || [];
}

// GET /accounts — liste tous les comptes
app.get('/accounts', async (req, res) => {
    try {
        const keys = await dsList();
        const accounts = await Promise.all(
            keys.map(async k => {
                const data = await dsGet(k.key);
                return { username: k.key, ...data, password: undefined };
            })
        );
        res.json(accounts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /accounts — créer un compte
app.post('/accounts', async (req, res) => {
    const { username, password, grade } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });
    try {
        const existing = await dsGet(username);
        if (existing) return res.status(409).json({ error: 'Ce username existe déjà' });
        await dsSet(username, {
            password,
            grade: grade || 'Gardien de la Paix',
            created: new Date().toLocaleDateString('fr-FR'),
            createdBy: 'Site PN31'
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /accounts/:username — supprimer un compte
app.delete('/accounts/:username', async (req, res) => {
    try {
        await dsDelete(req.params.username);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PATCH /accounts/:username — modifier le grade
app.patch('/accounts/:username', async (req, res) => {
    const { grade } = req.body;
    try {
        const data = await dsGet(req.params.username);
        if (!data) return res.status(404).json({ error: 'Compte introuvable' });
        await dsSet(req.params.username, { ...data, grade });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PN31 API running on port ${PORT}`));
