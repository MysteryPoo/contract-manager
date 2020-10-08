# contract-manager
Contract management system for Eve Echoes

## How-To Build
docker build . -t sometag
## How-To Run
Ensure your credentials filename is 'credential.json'

docker run -d --name corp-name -p someport:8080 -v /dir/to/credentials:/usr/src/app/credentials -v /dir/to/media:/usr/src/app/public/media -e banner=banner_file_name -e logo=logo_file_name sometag
