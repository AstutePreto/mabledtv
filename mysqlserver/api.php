<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Configuração do MySQL
$host = "localhost";
$user = "root";
$pass = ""; // Senha padrão do XAMPP costuma ser vazia
$db   = "mabledtv";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["error" => "Erro na conexão com o banco de dados"]));
}

// Descobre o endpoint (/cadastro ou /login)
$action = isset($_GET['action']) ? $_GET['action'] : '';
$data = json_decode(file_get_contents("php://input"), true);

// ROTA DE CADASTRO
if ($action === 'cadastro') {
    $nome = $data['nome'] ?? '';
    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $senha = $data['password'] ?? '';
    $telefone = $data['phone'] ?? '';

    if (empty($nome) || empty($email) || empty($username) || empty($senha)) {
        echo json_encode(["error" => "Preencha todos os campos obrigatórios."]);
        exit;
    }

    // Hash de segurança para a senha
    $senhaHash = password_hash($senha, PASSWORD_BCRYPT);

    $stmt = $conn->prepare("INSERT INTO usuarios (nome, email, username, senha, telefone, plano) VALUES (?, ?, ?, ?, ?, 'Grátis')");
    $stmt->bind_param("sssss", $nome, $email, $username, $senhaHash, $telefone);

    if ($stmt->execute()) {
        echo json_encode(["message" => "Conta criada com sucesso!"]);
    } else {
        echo json_encode(["error" => "E-mail ou Username já cadastrado!"]);
    }
    $stmt->close();
}

// ROTA DE LOGIN
if ($action === 'login') {
    $email = $data['email'] ?? '';
    $senha = $data['password'] ?? '';

    $stmt = $conn->prepare("SELECT * FROM usuarios WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        if (password_verify($senha, $user['senha'])) {
            echo json_encode([
                "message" => "Login realizado!",
                "user" => [
                    "id" => $user['id'],
                    "nome" => $user['nome'],
                    "email" => $user['email'],
                    "username" => $user['username'],
                    "plano" => $user['plano']
                ]
            ]);
        } else {
            echo json_encode(["error" => "E-mail ou senha incorretos."]);
        }
    } else {
        echo json_encode(["error" => "E-mail ou senha incorretos."]);
    }
    $stmt->close();
}

$conn->close();
?>