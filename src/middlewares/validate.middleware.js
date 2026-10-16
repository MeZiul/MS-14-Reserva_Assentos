export function validar(schemas = {}) {
    return (req, res, next) => {
        try {
            const validated = {};

            for (const campo of ["params", "query", "body", "headers"]) {
                if (schemas[campo]) {
                    validated[campo] = schemas[campo].parse(req[campo]);
                }
            }

            req.validated = validated;

            next();
        } catch (error) {
            next(error);
        }
    };
}
