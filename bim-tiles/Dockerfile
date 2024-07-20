# Stage 1: Build React app
FROM node:18.18.0-alpine3.17 as build

WORKDIR /app

# Sao chép các file cần thiết vào container
COPY package.json yarn.lock ./

# Cài đặt các dependency
RUN yarn install

# Sao chép toàn bộ mã nguồn vào container
COPY . .



# Build ứng dụng
RUN yarn build

# Stage 2: Serve app using Nginx
FROM nginx:latest

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the build output to Nginx's HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# COPY env.sh /docker-entrypoint.d/env.sh
# RUN chmod +x /docker-entrypoint.d/env.sh
# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
