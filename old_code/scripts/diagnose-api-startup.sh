#!/bin/bash

# Script de diagnostic pour le démarrage de l'API
# Vérifie tous les problèmes potentiels qui pourraient empêcher le serveur API de démarrer

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Diagnostic du démarrage de l'API Castiel"
echo "=========================================="
echo ""

# 1. Vérifier si le port 3001 est libre
echo "1. Vérification du port 3001..."
if lsof -i :3001 >/dev/null 2>&1; then
    echo "   ⚠️  Le port 3001 est déjà utilisé:"
    lsof -i :3001
    echo ""
else
    echo "   ✅ Le port 3001 est libre"
    echo ""
fi

# 2. Vérifier les dépendances Node.js
echo "2. Vérification des dépendances..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js installé: $NODE_VERSION"
else
    echo "   ❌ Node.js n'est pas installé"
    exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm -v)
    echo "   ✅ pnpm installé: $PNPM_VERSION"
else
    echo "   ❌ pnpm n'est pas installé"
    exit 1
fi
echo ""

# 3. Vérifier les erreurs de syntaxe TypeScript
echo "3. Vérification des erreurs TypeScript critiques..."
cd apps/api
if pnpm typecheck 2>&1 | grep -q "error TS"; then
    echo "   ⚠️  Des erreurs TypeScript ont été détectées:"
    pnpm typecheck 2>&1 | grep "error TS" | head -10
    echo ""
    echo "   Note: Certaines erreurs peuvent être non-bloquantes en développement"
else
    echo "   ✅ Aucune erreur TypeScript critique"
fi
echo ""

# 4. Vérifier les fichiers de configuration
echo "4. Vérification de la configuration..."
if [ -f ".env" ] || [ -f ".env.local" ]; then
    echo "   ✅ Fichier .env trouvé"
else
    echo "   ⚠️  Aucun fichier .env trouvé (peut être normal en développement)"
fi
echo ""

# 5. Vérifier Redis (optionnel mais recommandé)
echo "5. Vérification de Redis..."
if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "   ✅ Redis est accessible"
    else
        echo "   ⚠️  Redis n'est pas accessible (le serveur peut fonctionner en mode dégradé)"
    fi
else
    echo "   ⚠️  redis-cli n'est pas installé (impossible de vérifier Redis)"
fi
echo ""

# 6. Vérifier les erreurs de syntaxe dans les fichiers critiques
echo "6. Vérification des fichiers critiques..."
if grep -r "^\s*error\s*$" src/services/cache-warming.service.ts >/dev/null 2>&1; then
    echo "   ❌ Erreur de syntaxe détectée dans cache-warming.service.ts"
else
    echo "   ✅ cache-warming.service.ts semble correct"
fi
echo ""

# 7. Tentative de compilation
echo "7. Test de compilation..."
if pnpm build >/tmp/castiel-api-build.log 2>&1; then
    echo "   ✅ La compilation réussit"
    rm -f /tmp/castiel-api-build.log
else
    echo "   ❌ La compilation échoue. Voir /tmp/castiel-api-build.log pour les détails"
    echo "   Premières erreurs:"
    head -20 /tmp/castiel-api-build.log
fi
echo ""

# 8. Instructions de démarrage
echo "=========================================="
echo "📋 Instructions pour démarrer l'API:"
echo ""
echo "Option 1 (Recommandé):"
echo "  cd $PROJECT_ROOT"
echo "  pnpm dev:api"
echo ""
echo "Option 2:"
echo "  cd $PROJECT_ROOT/apps/api"
echo "  pnpm dev"
echo ""
echo "Option 3 (Tous les services):"
echo "  cd $PROJECT_ROOT"
echo "  pnpm dev"
echo ""
echo "Si le serveur ne démarre pas, vérifiez les logs ci-dessus"
echo ""



