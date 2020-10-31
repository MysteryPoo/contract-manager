# contract-manager
Contract management system for Eve Echoes

## Dependencies
* Docker Environment
* Redis server for session management
* Firebase Firestore for database management
## How-To Build
docker build . -t sometag
## How-To Run
Ensure your credentials filename is 'credential.json' // I'll be changing this into an environment variable when I remember.

docker run -d --name corp-name -p someport:8080 --network network-with-redis -v /dir/to/credentials:/usr/src/app/credentials -v /dir/to/media:/usr/src/app/public/media -e banner=banner_file_name -e logo=logo_file_name -e SESSION_SECRET=secretphrase -e REDIS=redis_uri sometag
###
Notes: It is highly recommended to run the redis server dockerized and next to this server behind the same network.
For example,
* docker run --name redis-server --network network-with-redis -d redis

You may now set the "-e REDIS=redis-server" as such. Only the ppu server will be able to connect to the redis as redis is not exposed to the external network.
