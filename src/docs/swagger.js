import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import YAML from "yaml";
import swaggerUi from "swagger-ui-express";

// Identifica a localização deste arquivo
const diretorioAtual = dirname(fileURLToPath(import.meta.url));

// Monta o caminho do arquivo YAML
const caminhoOpenApi = join(diretorioAtual, "openapi.yaml");

// Lê o conteúdo do arquivo
const conteudoYaml = readFileSync(caminhoOpenApi, "utf8");

// Converte o YAML para um objeto JavaScript
const especificacao = YAML.parse(conteudoYaml);

// Registra a documentação OpenAPI na aplicação Express
export function registrarSwagger(app) {
    // Disponibiliza o arquivo YAML original
    app.get("/openapi.yaml", (_req, res) => {
        return res.type("application/yaml").sendFile(caminhoOpenApi);
    });

    // Disponibiliza a interface Swagger UI
    app.use(
        "/docs",
        swaggerUi.serve,
        swaggerUi.setup(especificacao, {
            explorer: true,
            customSiteTitle: "WS-14 | API REST"
        })
    );
}