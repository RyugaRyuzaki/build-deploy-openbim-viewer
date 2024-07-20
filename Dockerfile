# Sử dụng image chính thức của Nginx từ Docker Hub
FROM nginx:latest

# Sao chép file cấu hình Nginx Load Balancer vào container
COPY nginx.conf /etc/nginx/nginx.conf

# Expose cổng 80 để load balancer có thể nhận traffic
EXPOSE 80

# Chạy Nginx trong chế độ foreground
CMD ["nginx", "-g", "daemon off;"]