const express = require('express');
const router = express.Router();
const { getIndices } = require('../services/nseService');

router.get('/', async (req, res) => {
  try {
    const data = await getIndices();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;