# Install

    - Nodejs v22.4.1
    - Docker version 24.0.5
    - Docker Compose version v2.20.2-desktop.
    - CDE VsCode
    - VsCode extension
        - typescript
        - docker
        - nginx.conf
        - ....
    - git
# bim-tiles for frontend

    - 1: Initialize project
    ```
    npm create vite
    ```
    - 2: Install packages
    ```
    axios
    @preact/signals-react
    @thatopen/components
    @thatopen/components-front
    @thatopen/fragments
    @thatopen/ui
    @thatopen/ui-obc
    three
    web-ifc
    ```
    - 3: Install and config tailwindcss
    ```
    yarn add -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    
    // tailwind.config.js
    /** @type {import('tailwindcss').Config} */
    export default {
        ...
    }
    ```
    - 4: Config typescript and vite

    - 5: Integrate [@thatopen template](https://github.com/ThatOpen/engine_templates/tree/main/templates/vanilla)

    - 6: Custom IfcStreamer (bim-tiles) from local files

    - 7: Upload files to server (after server-tiles ready)

    - 8: Load ifc as bim-tiles from storage 

# server-tiles for backend   

    - 1: Initialize project

    - 2: Install packages

    - 3: Register S3-storage

    - 4: config S3-storage to project

    - 5: working with buckets/objects and upload files from frontend

# Deploy in local production

    - 1: dockerfile and config nginx for frontend

    - 2: dockerfile for backend

    - 3: docker-compose

    - 4: create and login docker-hub

    - 5: push images to docker-hub

# Deploy in production

    - 1: Register cloud server
        - install putty and putty-gen
        - install winSCP
        - create ssh public and private key
        - create a cloud server

    - 2: ssh to cloud server with putty and winSCP

    - 3: setup cloud and install docker

    - 4: login and pull images from docker-hub

    - 5: setup docker-compose




