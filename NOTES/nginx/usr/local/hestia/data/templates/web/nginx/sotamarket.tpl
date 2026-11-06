#=========================================================================#
# SotaMARKET (sotamarket.com.ua) — http. Шаблон Hestia, копія smarket.  #
# Джерело: репозиторій SOTAMARKET, NOTES/nginx/usr/local/hestia/data/...  #
# Правити там і копіювати сюди; v-change-web-domain-proxy-tpl / rebuild   #
# перегенерують вхост із цього файлу.                                     #
#=========================================================================#
#
# Відмінність від node (як у smarket і floy): усе — на https://%domain_idn% ОДНИМ 301
# (і з www). У node спершу nginx.forcessl.conf (https://$host), а за ним редирект панелі — http://www.
# ішов двома кроками. Тому тут немає ні include nginx.forcessl.conf, ні редиректу
# панелі (на домені його прибрано: v-delete-web-domain-redirect).
#
# Редирект — у location /, а не на рівні server: так Let's Encrypt (регулярний
# location з nginx.conf_letsencrypt, include нижче) отримує токен на :80 напряму.

server {
    listen      %ip%:80;
    server_name %domain_idn% %alias_idn%;
    error_log   /var/log/%web_system%/domains/%domain%.error.log error;

    location ~ /\.(?!well-known\/|file) {
        deny all;
        return 404;
    }

    location / {
        return 301 https://%domain_idn%$request_uri;
    }

    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
