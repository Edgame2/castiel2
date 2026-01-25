# Changelog

All notable changes to the AI Service module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-23

### Fixed
- **Routes** (models, agents, completions): `error: any` → `error: unknown`; completions inner/outer catches use `error instanceof Error ? error.message : String(error)` for event and reply.

## [1.0.0] - 2024-01-XX

### Added

- Initial implementation of AI Service
- LLM completions support (OpenAI, Anthropic, Ollama)
- Model routing and selection
- Agent management
- Completion tracking
- Event publishing
- JWT authentication
- Health check endpoints

