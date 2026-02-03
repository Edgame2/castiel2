From the project root, use containers-up.md to track build status. Use only that filename everywhere.

1. If containers-up.md already exists and lists failing services: do not run a full build. Use that list, fix build errors (Dockerfile, dependencies, or source) for those services, and run:
   docker compose up
   only for the service(s) you changed. Update containers-up.md after each run. Go to step 4 when all listed failures are resolved.

2. If containers-up.md does not exist (or you need to discover failures): run a full build once:
   docker compose build --no-cache
   Record which services built successfully (upy) and which failed (failing) in containers-up.md.

3. Iterate: fix build errors for one or more failing services, then run:
   docker compose build --no-cache <service1> [<service2> ...]
   only for the service(s) you changed. Update the upy/failing lists in containers-up.md after each run.

4. If a fix might affect multiple services (e.g. shared workspace or base image), rebuild those services together.

5. When no services are failing, run a final full build: docker compose up. Update containers-up.md so all buildable services are marked upy.

6. Keep a clear list of upy vs failing buildable services in containers-up.md and focus on failing ones until all build.

Finish by giving an update xx containers healty out xx total containers.