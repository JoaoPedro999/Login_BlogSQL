const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

// Configurar a conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'phpmyadmin',
    password: 'aluno',
    database: 'mydb',
});

const USER_TYPES = {
    ADMIN: 'Administrador',
  };
  function checkUserTypeMiddleware(allowedUserTypes) {
    return function (req, res, next) {
        const userType = getUserTypeFromSession(); 
        if (allowedUserTypes.includes(userType)) {
            next();
        } else {
            res.status(403).send('Acesso proibido'); 
        }
    };
}

function getUserTypeFromSession(req) {
    // Implemente a lógica real para obter o tipo de usuário da sessão
    // Exemplo: return req.session.userType;
    return 'Administrador'; // Substitua isso com a lógica real
}


db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        throw err;
    }
    console.log('Conexão com o banco de dados MySQL estabelecida.');
});

// Configurar a sessão
app.use(
    session({
        secret: 'Escreva aqui a senha para criptografar as sessões.',
        resave: true,
        saveUninitialized: true,
    })
);

// Configuração de pastas com aquivos estáticos
//app.use('/img', express.static(__dirname + '/img'))
app.use('/', express.static(__dirname + '/static'));

// Engine do Express para processar o EJS (templates)
// Lembre-se que para uso do EJS uma pasta (diretório) 'views', precisa existir na raiz do projeto.
// E que todos os EJS serão processados a partir desta pasta
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar EJS como o motor de visualização
app.set('view engine', 'ejs');

// Configuração das rotas do servidor HTTP
// A lógica ddo processamento de cada rota deve ser realizada aqui
app.get('/', (req, res) => {
    // Passe a variável 'req' para o template e use-a nas páginas para renderizar partes do HTML conforme determinada condição
    // Por exemplo de o usuário estive logado, veja este exemplo no arquivo views/partials/header.ejs
    res.render('pages/index', { req: req });
    // Caso haja necessidade coloque pontos de verificação para verificar pontos da sua logica de negócios
    console.log(`${req.session.username ? `Usuário ${req.session.username} logado no IP ${req.connection.remoteAddress}` : 'Usuário não logado.'}  `);
    //console.log(req.connection)
    ;
});

// Rota para a página de login
app.get('/login', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON
    res.render('pages/login', { req: req });
});


app.get('/about', (req, res) => {
    res.render('pages/about', { req: req, posts: dados });
});



app.get('/posts', (req, res) => {
    db.query('SELECT * FROM posts', (err, results) => {
        if (err) {
            console.error('Erro na consulta SQL:', err);
            return res.status(500).send('Erro interno. <a href="/posts">Tente novamente</a>');
        }
        console.log(results);
        res.render('pages/pgposts', { req: req, posts: results });
    });
});



app.get('/postlist', (req, res) => {
    const userId = req.session.username;

    // Consultar o banco de dados para obter o número total de postagens do usuário
    db.query('SELECT COUNT(*) as postCount FROM posts WHERE usuario = ?', [userId], (errCount, resultCount) => {
        if (errCount) {
            console.error(errCount);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        const postCount = resultCount[0].postCount;

        // Consultar o banco de dados para obter a lista de postagens do usuário
        db.query('SELECT * FROM posts WHERE usuario = ?', [userId], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Erro interno do servidor');
                return;
            }

            // Renderizar a página e passar 'name', 'postCount', e 'posts' para o EJS
            res.render('pages/postlist', { usuario: req.session.name, postCount, posts: result, req: req });
        });
    });
});

app.get('/postlistadm',checkUserTypeMiddleware([USER_TYPES.ADMIN]), (req, res) => {
    // Remove the line that gets the user ID from the session
    // const userId = req.session.username;

    // Consultar o banco de dados para obter o número total de postagens
    db.query('SELECT COUNT(*) as postCount FROM posts', (errCount, resultCount) => {
        if (errCount) {
            console.error(errCount);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        const postCount = resultCount[0].postCount;

        // Consultar o banco de dados para obter a lista de todas as postagens
        db.query('SELECT * FROM posts', (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Erro interno do servidor');
                return;
            }

            // Renderizar a página e passar 'name', 'postCount', e 'posts' para o EJS
            res.render('pages/postlistadm', { usuario: req.session.name, postCount, posts: result, req: req });
        });
    });
});

app.post('/excluirtodaspostagens', (req, res) => {
    // Adicione lógica para excluir todas as postagens do banco de dados
    db.query('DELETE FROM posts', (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        // Envie uma resposta indicando que a exclusão foi bem-sucedida
        res.status(200).send('Todas as postagens foram excluídas com sucesso.');
    });
});


//excluir post
app.get('/excluirPost/:id', (req, res) => {
    const id = req.params.id;
    
    db.query('DELETE FROM posts WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Erro ao excluir post:', err);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        // Adicione o console.log para registrar a exclusão do post
        console.log(`Post com ID ${id} excluído com sucesso.`);

        res.redirect('/postlist');
    });

});




app.get('/post_failed', (req, res) => {
    res.render('pages/post_failed', { req: req })
});


// Rota para processar o formulário de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';

    db.query(query, [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/dashboard');
        } else {
            // res.send('Credenciais incorretas. <a href="/">Tente novamente</a>');
            res.redirect('/login_failed');
        }
    });
});

// Rota para processar o formulário de caastro depostagem
app.post('/cadastrar_posts', (req, res) => {
    const { titulo, conteudo } = req.body;
    const usuario = req.session.username;
    const data = new Date();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // Os meses começam do zero, por isso adicionamos 1.
    const ano = data.getFullYear();

    const dataFormatada = `${dia}/${mes}/${ano}`;

    console.log(dataFormatada);
    // const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    const query = 'INSERT INTO posts (titulo, conteudo, usuario, data) VALUES (?, ?, ?, ?)';

    db.query(query, [titulo, conteudo, usuario, data], (err, results) => {
        if (err) throw err;

        if (results.affectedRows > 0) {
            console.log('Cadastro de postagem OK')
            res.redirect('/dashboard');
        } else {
            // res.send('Credenciais incorretas. <a href="/">Tente novamente</a>');
            res.redirect('/post_failed');
        }
    });
});

// Rota para a página cadastro do post
app.get('/cadastrar_posts', (req, res) => {
    if (req.session.loggedin) {
        res.render('pages/cadastrar_posts', { req: req });
    }
    else {
        res.redirect('/login_failed');
    }

});

// Rotas para cadastrar
app.get('/cadastrar', (req, res) => {
    if (!req.session.loggedin) {
        res.render('pages/cadastrar', { req: req });
    } else {
        res.redirect('pages/dashboard', { req: req });
    }
});

// Rota para efetuar o cadastro de usuário no banco de dados
app.post('/cadastrar', (req, res) => {
    const { username, password } = req.body;

    // Verifica se o usuário já existe
    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    db.query(query, [username, password], (err, results) => {
        if (err) throw err;
        // Caso usuário já exista no banco de dados, redireciona para a página de cadastro inválido
        if (results.length > 0) {
            console.log(`Usuário ${username} já existe no banco de dados. redirecionando`);
            res.redirect('/register_failed');
        } else {
            // Cadastra o usuário caso não exista
            const query = 'INSERT INTO users (username, password) VALUES (?, SHA1(?))';
            console.log(`POST /CADASTAR -> query -> ${query}`);
            db.query(query, [username, password], (err, results) => {
                console.log(results);
                //console.log(`POST /CADASTAR -> results -> ${results}`);

                if (err) {
                    console.log(`ERRO NO CADASTRO: ${err}`);
                    throw err;
                }
                if (results.affectedRows > 0) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/register_ok');
                }
            });
        }
    });
});

app.get('/register_failed', (req, res) => {
    res.render('pages/register_failed', { req: req });
});

app.get('/register_ok', (req, res) => {
    res.render('pages/register_ok', { req: req });
});

app.get('/login_failed', (req, res) => {
    res.render('pages/login_failed', { req: req });
});

// Rota para a página do painel
app.get('/dashboard', (req, res) => {
    //
    //modificação aqui
    if (req.session.loggedin) {
        //res.send(`Bem-vindo, ${req.session.username}!<br><a href="/logout">Sair</a>`);
        // res.sendFile(__dirname + '/index.html');
        res.render('pages/dashboard', { req: req });
    } else {
        res.send('Faça login para acessar esta página. <a href="/">Login</a>');
    }
});

// Rota para processar a saida (logout) do usuário
// Utilize-o para encerrar a sessão do usuário
// Dica 1: Coloque um link de 'SAIR' na sua aplicação web
// Dica 2: Você pode implementar um controle de tempo de sessão e encerrar a sessão do usuário caso este tempo passe.
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Rota de teste
app.get('/teste', (req, res) => {
    res.render('pages/teste', { req: req });
});


app.listen(3000, () => {
    console.log('----Login (MySQL version)-----')
    console.log('Servidor rodando na porta 3000');
});
