# API Documentation

This directory contains the canonical OpenAPI 3.0 specification for the Castiel API.

## OpenAPI Specification

The OpenAPI specification is automatically generated from the Fastify server's route definitions and schemas.

### Generating the Specification

To generate the canonical OpenAPI spec file:

```bash
# From the root directory
pnpm --filter @castiel/api run export:openapi
```

This will create:
- `openapi.json` - JSON format (always generated)
- `openapi.yaml` - YAML format (if js-yaml is installed)

### Accessing the Specification

The OpenAPI spec is also available via HTTP endpoints when the server is running:

- **Swagger UI**: `http://localhost:3001/docs` (interactive documentation)
- **JSON Spec**: `http://localhost:3001/docs/json` (raw OpenAPI JSON)
- **YAML Spec**: `http://localhost:3001/docs/yaml` (raw OpenAPI YAML)

### Using the Specification

The OpenAPI spec can be used with:

- **Code Generation**: Generate client SDKs using [OpenAPI Generator](https://openapi-generator.tech/)
- **API Testing**: Import into Postman, Insomnia, or other API testing tools
- **Documentation**: Generate static documentation using [Redoc](https://redocly.com/) or [Swagger UI](https://swagger.io/tools/swagger-ui/)
- **Validation**: Validate API requests/responses using OpenAPI validators

### Example: Generate TypeScript Client

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/apidoc/openapi.yaml \
  -g typescript-axios \
  -o generated/client
```

### Updating the Specification

The OpenAPI spec is automatically generated from:
- Route definitions in `apps/api/src/routes/`
- Schema definitions in `apps/api/src/schemas/`
- Swagger configuration in `apps/api/src/plugins/swagger.ts`

To update the spec:
1. Modify route definitions or schemas
2. Run `pnpm --filter @castiel/api run export:openapi`
3. Commit the updated `openapi.json` and `openapi.yaml` files

### Validation

Validate the OpenAPI spec:

```bash
# Using spectral (recommended)
npm install -g @stoplight/spectral-cli
spectral lint docs/apidoc/openapi.yaml

# Using openapi-generator
openapi-generator-cli validate -i docs/apidoc/openapi.yaml

# Using swagger-parser (Node.js)
node -e "const SwaggerParser = require('@apidevtools/swagger-parser'); SwaggerParser.validate('docs/apidoc/openapi.yaml').then(() => console.log('Valid')).catch(err => { console.error('Invalid:', err.message); process.exit(1); });"
```

**CI Validation**: The OpenAPI spec is automatically validated in CI on every push and pull request. See `.github/workflows/validate-openapi.yml` for details.

---

**Last Updated**: January 2025  
**OpenAPI Version**: 3.0.0  
**API Version**: 1.0.0

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - OpenAPI documentation fully documented

#### Implemented Features (✅)

- ✅ OpenAPI specification generation
- ✅ Swagger UI integration
- ✅ Code generation support
- ✅ Validation tools

#### Known Limitations

- ⚠️ **Specification Completeness** - OpenAPI spec may not include all endpoints
  - **Recommendation:**
    1. Verify all endpoints are documented
    2. Update route definitions
    3. Regenerate specification

- ⚠️ **Schema Validation** - Schema validation may not be complete
  - **Recommendation:**
    1. Validate all schemas
    2. Add missing schema definitions
    3. Test schema validation

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [API README](../api/README.md) - API overview
- [Backend Documentation](../backend/README.md) - Backend implementation







