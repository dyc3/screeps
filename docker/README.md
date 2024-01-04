# Using docker to run a private server locally

1. Create `docker/config.yml`

```yaml
steamKey: <your steam key> # get this from https://steamcommunity.com/dev/apikey
pinnedPackages:
  ssri: 8.0.1
  cacache: 15.3.0
  passport-steam: 1.0.17
  minipass-fetch: 2.1.2
  express-rate-limit: 6.7.0
version: latest
mods:
  - screepsmod-auth
  - screepsmod-admin-utils
  - screepsmod-mongo
  - screepsmod-map-tool
```

Using Mongodb is optional, but can give you way faster tick rates.
~~I haven't been able to get it working with mongodb yet. The container won't start for me.~~ Mongodb works if you use `mongo:5` instead of latest. No idea why every other version gives "Operation not permitted."

2. Find your local screeps install. You'll need the path to the `package.nw` file.
It's probably in `~/.steam/steam/steamapps/common/Screeps`

3. Run `docker-compose up` from the root of this repo, with the `SCREEPS_NW_PATH` environment variable set to the path from step 2.

```bash
SCREEPS_NW_PATH="~/.steam/steam/steamapps/common/Screeps/package.nw" docker-compose up
```

4. Open `http://localhost:9444` in your browser.
5. Log in with your steam account, set a password at `http://localhost:21025/authmod/password/`
6. Set credentials for `local` in both `.screeps.yml` and `screeps.json` in the root of this repo.
```json
{
	"local": {
		"email": "<username>",
		"password": "<password>",
		"protocol": "http",
		"hostname": "127.0.0.1",
		"port": 21025,
		"path": "/",
		"branch": "main"
	}
}
```
7. `yarn push-local` to push code to your local server.

All done.

## Useful commands

Open the js console of the screeps server:
```bash
docker-compose exec screeps screeps-launcher cli
```
