JavaScript
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Conexão com o MySQL
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',      // Altere se o usuário do seu MySQL for diferente
  password: 'Home@spSenai2025!',      // Coloque a sua senha do MySQL (se tiver)
  database: 'mabledtv'
});

// Testar Conexão
db.getConnection((err) => {
  if (err) console.error('Erro ao conectar no MySQL:', err);
  else console.log('Conectado ao MySQL com sucesso!');
});

// --- ROTA DE CADASTRO ---
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, password, username, phone } = req.body;

  if (!nome || !email || !password || !username) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    // Criptografa a senha antes de salvar no MySQL
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO usuarios (nome, email, username, senha, telefone, plano) VALUES (?, ?, ?, ?, ?, 'Grátis')`;
    
    db.query(sql, [nome, email, username, passwordHash, phone || null], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'E-mail ou Username já cadastrados!' });
        }
        return res.status(500).json({ error: 'Erro no servidor ao salvar usuário.' });
      }

      return res.status(201).json({ message: 'Conta criada com sucesso!' });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// --- ROTA DE LOGIN ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const sql = `SELECT * FROM usuarios WHERE email = ?`;

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados.' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const usuario = results[0];

    // Compara a senha informada com o hash salvo no banco
    const senhaValida = await bcrypt.compare(password, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    return res.json({
      message: 'Login realizado!',
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        username: usuario.username,
        plano: usuario.plano
      }
    });
  });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});