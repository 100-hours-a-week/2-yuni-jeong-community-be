FROM node:21
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install && npm audit fix
COPY . .
EXPOSE 8080
CMD ["node", "app.js"]
