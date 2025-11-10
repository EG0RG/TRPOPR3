const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auto.html'));
});
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) return console.error('Ошибка подключения к БД:', err.message);
  console.log('✅ Подключено к SQLite базе данных.');
});
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      price REAL
    )
  `);
});

// --- Запрос 1: получить все автомобили ---
app.get('/api/cars', (req, res) => {
  db.all('SELECT * FROM cars', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Запрос 2: добавить автомобиль ---
app.post('/api/cars', (req, res) => {
  const { brand, model, year, price } = req.body;
  if (!brand || !model) {
    return res.status(400).json({ error: 'Поля brand и model обязательны' });
  }
  db.run(
    'INSERT INTO cars (brand, model, year, price) VALUES (?, ?, ?, ?)',
    [brand, model, year, price],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, brand, model, year, price });
    }
  );
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚗 Сервер запущен: http://localhost:${PORT}`);
});
