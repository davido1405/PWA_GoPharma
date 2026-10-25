FROM php:8.2-cli

WORKDIR /app

# Installe Node.js (nécessaire pour le build Tailwind via npm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copie le code source
COPY . .

# Installe les dépendances PHP si un composer.json existe
# (décommente si le projet utilise Composer)
# RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
#     && composer install --no-dev --optimize-autoloader

# Installe les dépendances Node et build les assets (Tailwind)
RUN npm install && npm run build

EXPOSE 8080

CMD php -S 0.0.0.0:${PORT:-8080} router.php
