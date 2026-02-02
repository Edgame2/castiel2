From the project root, use containers-health.md to track build status. Use only that filename everywhere.

1. If containers-health.md already exists and lists failing services: do not run a full build. Use that list, fix build errors (Dockerfile, dependencies, or source) for those services, and run:
   docker compose build --no-cache <service1> [<service2> ...]
   only for the service(s) you changed. Update containers-health.md after each run. Go to step 4 when all listed failures are resolved.

2. If containers-health.md does not exist (or you need to discover failures): run a full build once:
   docker compose build --no-cache
   Record which services built successfully (healthy) and which failed (failing) in containers-health.md.

3. Iterate: fix build errors for one or more failing services, then run:
   docker compose build --no-cache <service1> [<service2> ...]
   only for the service(s) you changed. Update the healthy/failing lists in containers-health.md after each run.

4. If a fix might affect multiple services (e.g. shared workspace or base image), rebuild those services together.

5. When no services are failing, run a final full build: docker compose build --no-cache. Update containers-health.md so all buildable services are marked healthy.

6. Keep a clear list of healthy vs failing buildable services in containers-health.md and focus on failing ones until all build.

Finish by giving an update xx containers healty out xx total containers.