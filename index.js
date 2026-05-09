const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = '9936071044';
const DATASTORE_NAME = 'Comptes';
const BASE = `https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/data-stores/${DATASTORE_NAME}/entries`;

async function dsGet(key) {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    headers: { 'x-api-key': ROBLOX_API_KEY }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dsSet(key, value) {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: {
      'x-api-key': ROBLOX_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

async function dsDelete(key) {
  const res = await fetch(`${BASE}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'x-api-key': ROBLOX_API_KEY }
  });
  if (!res.ok && res.status !== 404) throw new Error(await res.text());
  return true;
}

async function dsList() {
  const res = await fetch(`https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/data-stores/${DATASTORE_NAME}/entries?maxPageSize=100`, {
    headers: { 'x-api-key': ROBLOX_API_KEY }
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.entries || [];
}

app.get('/accounts', async (req, res) => {
  try {
    const entries = await dsList();
    const accounts = await Promise.all(
      entries.map(async e => {
        const key = e.id.split('/').pop();
        const data = await dsGet(key);
        return { username: key, ...data };
      })
    );
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

app.delete('/accounts/:username', async (req, res) => {
  try {
    await dsDelete(req.params.username);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
app.listen(PORT, () => console.log(`PN31 API on port ${PORT}`));
