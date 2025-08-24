# Dockerfile
FROM node:20-alpine

# Thư mục làm việc trong container
WORKDIR /usr/src/app

# Copy package.json & package-lock.json
COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Mở port
EXPOSE 8080

# Lệnh chạy khi container start
CMD ["npm", "run", "dev"]
