FROM php:7.2-apache
ENV DOCKER=true

# Install PHP configuration file(s)
ADD *.ini /usr/local/etc/php/

# Install custom apache config
ADD apache2.conf /etc/apache2/apache2.conf
ADD ports.conf /etc/apache2/ports.conf

# Enable a couple useful apache modules
RUN a2enmod rewrite headers

# No CMD line because we don't need to override the Apache image's default
