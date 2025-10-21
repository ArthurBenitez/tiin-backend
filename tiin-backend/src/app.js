import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const pool = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "senai",
  database: "devhub",
});

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Olá Mundo");
});

// ==================== USUÁRIOS ====================

app.get("/usuarios", async (req, res) => {
  const [results] = await pool.query("SELECT * FROM usuario");
  res.send(results);
});

app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const [results] = await pool.query(
    "SELECT * FROM usuario WHERE id = ?",
    [id]
  );
  res.send(results);
});

app.post("/usuarios", async (req, res) => {
  try {
    const { body } = req;
    const [results] = await pool.query(
      "INSERT INTO usuario (nome, idade) VALUES (?, ?)",
      [body.nome, body.idade]
    );

    const [usuarioCriado] = await pool.query(
      "SELECT * FROM usuario WHERE id = ?",
      [results.insertId]
    );

    return res.status(201).json(usuarioCriado);
  } catch (error) {
    console.log(error);
  }
});

app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM usuario WHERE id = ?", [id]);
    res.status(200).send("Usuário deletado!");
  } catch (error) {
    console.log(error);
  }
});

app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    await pool.query(
      "UPDATE usuario SET nome = ?, idade = ? WHERE id = ?",
      [body.nome, body.idade, id]
    );
    res.status(200).send("Usuário atualizado!");
  } catch (error) {
    console.log(error);
  }
});


// ==================== REGISTRO E LOGIN ====================

app.post("/registrar", async (req, res) => {
  try {
    const { body } = req;
    const [results] = await pool.query(
      "INSERT INTO usuario (nome, idade, email, senha) VALUES (?, ?, ?, ?)",
      [body.nome, body.idade, body.email, body.senha]
    );

    const [usuarioCriado] = await pool.query(
      "SELECT * FROM usuario WHERE id = ?",
      [results.insertId]
    );

    return res.status(201).json(usuarioCriado);
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { body } = req;
    const [usuario] = await pool.query(
      "SELECT * FROM usuario WHERE email = ? AND senha = ?",
      [body.email, body.senha]
    );

    if (usuario.length > 0) {
      return res.status(200).json({
        message: "Usuário logado com sucesso!",
        dados: usuario,
      });
    } else {
      return res.status(404).send("Email ou senha incorretos!");
    }
  } catch (error) {
    console.log(error);
  }
});


// ==================== LOGS ====================

app.get("/logs", async (req, res) => {
  const { query } = req;
  const pagina = Number(query.pagina) - 1 || 0;
  const quantidade = Number(query.quantidade) || 10;
  const offset = pagina * quantidade;

  const [results] = await pool.query(
    `
      SELECT
        lgs.id,
        lgs.categoria,
        lgs.horas_trabalhadas,
        lgs.linhas_codigo,
        lgs.bugs_corrigidos,
        COUNT(likes.id) AS likes,
        COALESCE(SUM(likes.qnt_comments), 0) AS qnt_comments
      FROM
        devhub.lgs
      LEFT JOIN devhub.likes
        ON likes.id_log = lgs.id
      GROUP BY
        lgs.id,
        lgs.categoria,
        lgs.horas_trabalhadas,
        lgs.linhas_codigo,
        lgs.bugs_corrigidos
      ORDER BY lgs.id ASC
      LIMIT ?
      OFFSET ?;
    `,
    [quantidade, offset]
  );

  res.send(results);
});


// Alterar app.post de logs para adicionar id_usuario

app.post("/logs", async (req, res) => {
  try {
    const { body } = req;
    const { categoria, horas_trabalhadas, linhas_codigo, bugs_corrigidos, id_usuario } = body;

    const [results] = await pool.query(
      "INSERT INTO lgs (categoria, horas_trabalhadas, linhas_codigo, bugs_corrigidos, id_usuario) VALUES (?, ?, ?, ?, ?)",
      [categoria, horas_trabalhadas, linhas_codigo, bugs_corrigidos, id_usuario]
    );

    const [logCriado] = await pool.query(
      "SELECT * FROM lgs WHERE id = ?",
      [results.insertId]
    );

    res.status(201).json(logCriado);
  } catch (error) {
    console.log(error);
  }
});



// ==================== LIKES ====================

app.get("/likes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await pool.query("SELECT * FROM likes WHERE id = ?", [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Like não encontrado." });
    }

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar like." });
  }
});

app.post("/likes", async (req, res) => {
  const { id_log, id_user, qnt_comments } = req.body;

  try {
    // Verifica se o usuário existe
    const [user] = await pool.query("SELECT * FROM usuario WHERE id = ?", [id_user]);
    if (user.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    // Verifica se o log existe
    const [log] = await pool.query("SELECT * FROM lgs WHERE id = ?", [id_log]);
    if (log.length === 0) {
      return res.status(400).json({ error: "Log não encontrado." });
    }

    // Faz o insert se tudo existir
    const [result] = await pool.query(
      "INSERT INTO likes (id_log, id_user, qnt_comments) VALUES (?, ?, ?)",
      [id_log, id_user, qnt_comments || 0]
    );

    res.json({ message: "Like adicionado com sucesso!", id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao inserir like." });
  }
});

app.put("/likes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { qnt_comments } = req.body;

    await pool.query(
      "UPDATE likes SET qnt_comments = ? WHERE id = ?",
      [qnt_comments, id]
    );

    const [likeAtualizado] = await pool.query(
      "SELECT * FROM likes WHERE id = ?",
      [id]
    );

    res.status(200).json(likeAtualizado);
  } catch (error) {
    console.log(error);
  }
});


//     COMMENTS (COMENTÁRIOS)
// ==============================

// Listar todos os comentários
app.get("/comments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.conteudo, c.data_criacao,
             u.nome AS usuario,
             l.categoria AS log_categoria
      FROM comments c
      JOIN usuario u ON c.id_user = u.id
      JOIN lgs l ON c.id_log = l.id
      ORDER BY c.data_criacao DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    res.status(500).json({ error: "Erro ao buscar comentários" });
  }
});

// Adicionar novo comentário
app.post("/comments", async (req, res) => {
  const { id_log, id_user, conteudo } = req.body;

  if (!id_log || !id_user || !conteudo) {
    return res.status(400).json({ error: "Campos obrigatórios: id_log, id_user, conteudo" });
  }

  try {
    // Verifica se usuário existe
    const [user] = await pool.query("SELECT * FROM usuario WHERE id = ?", [id_user]);
    if (user.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    // Verifica se log existe
    const [log] = await pool.query("SELECT * FROM lgs WHERE id = ?", [id_log]);
    if (log.length === 0) {
      return res.status(400).json({ error: "Log não encontrado." });
    }

    // Insere comentário
    const [result] = await pool.query(
      "INSERT INTO comments (id_log, id_user, conteudo) VALUES (?, ?, ?)",
      [id_log, id_user, conteudo]
    );

    res.json({
      message: "Comentário adicionado com sucesso!",
      commentId: result.insertId,
    });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ error: "Erro ao adicionar comentário" });
  }
});

//pwgar likes e comments

app.get("/logs/:id/details", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar log
    const [logRows] = await pool.query("SELECT * FROM lgs WHERE id = ?", [id]);
    if (logRows.length === 0) {
      return res.status(404).json({ error: "Log não encontrado." });
    }
    const log = logRows[0];

    // Buscar likes
    const [likeRows] = await pool.query("SELECT * FROM likes WHERE id_log = ?", [id]);

    // Buscar comentários
    const [commentRows] = await pool.query(`
      SELECT c.id, c.conteudo, c.data_criacao, u.nome AS usuario
      FROM comments c
      JOIN usuario u ON c.id_user = u.id
      WHERE c.id_log = ?
      ORDER BY c.data_criacao DESC
    `, [id]);

    res.json({
      log,
      likes: likeRows,
      comments: commentRows,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do log:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do log" });
  }
});

app.get("/logs/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o log existe
    const [logRows] = await pool.query("SELECT * FROM lgs WHERE id = ?", [id]);
    if (logRows.length === 0) {
      return res.status(404).json({ error: "Log não encontrado." });
    }

    // Busca os comentários relacionados ao log
    const [commentRows] = await pool.query(`
      SELECT c.id, c.conteudo, c.data_criacao, u.nome AS usuario
      FROM comments c
      JOIN usuario u ON c.id_user = u.id
      WHERE c.id_log = ?
      ORDER BY c.data_criacao DESC
    `, [id]);

    res.json(commentRows);
  } catch (error) {
    console.error("Erro ao buscar comentários do log:", error);
    res.status(500).json({ error: "Erro ao buscar comentários do log" });
  }
});

//deletar like com query params:

app.delete("/likes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM likes WHERE id = ?", [id]);
    res.status(200).send("Like deletado!");
  } catch (error) {
    console.log(error);
  }
});

app.delete("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM comments WHERE id = ?", [id]);
    res.status(200).send("Comentário deletado!");
  } catch (error) {
    console.log(error);
  }
});

// ==================== SERVIDOR ====================

app.listen(3000, () => {
  console.log("Servidor rodando na porta: 3000");
});

//Banco de dados MYSQL completo:

/*
CREATE DATABASE devhub;
USE devhub;
CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  idade INT,
  email VARCHAR(100) UNIQUE,
  senha VARCHAR(100)
);
CREATE TABLE lgs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria VARCHAR(100) NOT NULL,
  horas_trabalhadas INT,
  linhas_codigo INT,
  bugs_corrigidos INT
);
CREATE TABLE likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_log INT,
  id_user INT,
  qnt_comments INT DEFAULT 0,
  FOREIGN KEY (id_log) REFERENCES lgs(id),
  FOREIGN KEY (id_user) REFERENCES usuario(id)
);
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_log INT,
  id_user INT,
  conteudo TEXT NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_log) REFERENCES lgs(id),
  FOREIGN KEY (id_user) REFERENCES usuario(id)
);

//Alterar tabela de logs para adicionar id_usuario

ALTER TABLE lgs ADD COLUMN id_usuario INT,
ADD FOREIGN KEY (id_usuario) REFERENCES usuario(id);


*/