FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_ENABLE_MSW=false
ARG VITE_USE_MOCKS=false
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ENABLE_MSW=${VITE_ENABLE_MSW}
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}

RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /etc/nginx/tls

EXPOSE 80 443
