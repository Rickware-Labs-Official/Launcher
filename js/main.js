function profilePicUrl(profilePicturePath) {
    if (!profilePicturePath) return '';
    if (profilePicturePath.startsWith('data:') || profilePicturePath.startsWith('http')) return profilePicturePath;
    return apiUrl('/api/profile_picture/' + encodeURIComponent(profilePicturePath));
}

function showBanner(message, type) {
    var existing = document.getElementById('rickware-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'rickware-banner';
    var bg, border, iconSvg;
    if (type === 'error') {
        bg = 'rgba(30,0,50,0.72)';
        border = 'rgba(200,80,255,0.45)';
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else if (type === 'success') {
        bg = 'rgba(10,30,15,0.72)';
        border = 'rgba(80,200,100,0.45)';
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" style="flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else {
        bg = 'rgba(20,0,40,0.72)';
        border = 'rgba(155,0,204,0.45)';
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
    banner.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;align-items:center;gap:10px;padding:13px 22px;border-radius:14px;font-size:14px;font-weight:600;color:#fff;background:' + bg + ';border:1px solid ' + border + ';backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,0.45),0 0 0 1px ' + border + ';transition:opacity 0.4s,transform 0.4s;opacity:1;max-width:90vw;white-space:nowrap;cursor:pointer;';
    banner.innerHTML = iconSvg + '<span>' + escHtml(typeof message === 'string' ? message : 'Something went wrong. Please try again.') + '</span>';
    document.body.appendChild(banner);
    var timer = setTimeout(function() {
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(-12px)';
        setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
    }, 10000);
    banner.addEventListener('click', function() {
        clearTimeout(timer);
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(-12px)';
        setTimeout(function() { if (banner.parentNode) banner.remove(); }, 400);
    });
}

let config = {};
let products = [];
let currentLanguage = 'en';
let cart = [];
let wishlist = [];
let userPurchases = [];
let currentUser = null;

const translations = {
    en: {
        store: 'Store',
        library: 'Library',
        customer_panel: 'Customer Panel',
        discover: 'Discover',
        browse: 'Browse',
        news: 'News',
        search_store: 'Search store',
        wishlist: 'Wishlist',
        cart: 'Cart',
        show: 'Show:',
        new_release: 'New Release',
        price_low: 'Price: Low to High',
        price_high: 'Price: High to Low',
        popular: 'Most Popular',
        filters: 'Filters',
        reset: 'reset',
        keywords: 'Keywords',
        events: 'Events',
        price: 'Price',
        genre: 'Genre',
        features: 'Features',
        types: 'Types',
        apps: 'Apps',
        editor: 'Editor',
        stock_unlimited: 'Unlimited',
        stock_left: 'left',
        add_to_cart: 'Add to Cart',
        view_details: 'View Details',
        my_products: 'My Products',
        all: 'All',
        purchases: 'Purchases',
        recent: 'Recent',
        name: 'Name',
        category: 'Category',
        date: 'Date',
        product: 'Product',
        amount: 'Amount',
        coupon: 'Coupon',
        saved: 'Saved',
        no_coupon: 'No coupon',
        account_settings: 'Account Settings',
        preferences: 'Preferences',
        payment_methods: 'Payment Methods',
        order_history: 'Order History',
        help_support: 'Help & Support',
        logout: 'Logout',
        login: 'Login',
        register: 'Register',
        login_title: 'Sign In',
        login_description: 'Enter your credentials to access your account',
        email: 'Email',
        password: 'Password',
        remember_me: 'Remember me',
        forgot_password: 'Forgot password?',
        login_button: 'Sign In',
        or: 'OR',
        google_login: 'Continue with Google',
        discord_login: 'Continue with Discord',
        register_title: 'Create Account',
        register_description: 'Sign up to get started with premium products',
        username: 'Username',
        username_or_email: 'Username or Email',
        phone_number: 'Phone Number',
        confirm_password: 'Confirm Password',
        accept_terms: 'I accept the Terms of Service and Privacy Policy',
        email_newsletter: 'Subscribe to email newsletter',
        register_button: 'Create Account',
        google_register: 'Sign up with Google',
        discord_register: 'Sign up with Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Welcome to the future of digital products',
        feature_1: 'Instant Access to Products',
        feature_2: 'Secure Payment Processing',
        feature_3: 'Premium Support',
        auto_setup: 'Auto Setup',
        install: 'Install',
        uninstall: 'Uninstall',
        update: 'Update',
        installed: 'Installed',
        buy_now: 'Buy Now',
        select_duration: 'Select Duration',
        description: 'Description',
        specifications: 'Specifications',
        system_requirements: 'System Requirements'
    },
    de: {
        store: 'Store',
        library: 'Bibliothek',
        customer_panel: 'Kundenbereich',
        discover: 'Entdecken',
        browse: 'Durchsuchen',
        news: 'Neuigkeiten',
        search_store: 'Store durchsuchen',
        wishlist: 'Wunschliste',
        cart: 'Warenkorb',
        show: 'Anzeigen:',
        new_release: 'Neu erschienen',
        price_low: 'Preis: Niedrig bis Hoch',
        price_high: 'Preis: Hoch bis Niedrig',
        popular: 'Am beliebtesten',
        filters: 'Filter',
        reset: 'zurücksetzen',
        keywords: 'Stichwörter',
        events: 'Ereignisse',
        price: 'Preis',
        genre: 'Genre',
        features: 'Funktionen',
        types: 'Typen',
        apps: 'Apps',
        editor: 'Editor',
        stock_unlimited: 'Unbegrenzt',
        stock_left: 'übrig',
        add_to_cart: 'In den Warenkorb',
        view_details: 'Details anzeigen',
        my_products: 'Meine Produkte',
        all: 'Alle',
        purchases: 'Käufe',
        recent: 'Neueste',
        name: 'Name',
        category: 'Kategorie',
        date: 'Datum',
        product: 'Produkt',
        amount: 'Betrag',
        coupon: 'Gutschein',
        saved: 'Gespart',
        no_coupon: 'Kein Gutschein',
        account_settings: 'Kontoeinstellungen',
        preferences: 'Einstellungen',
        payment_methods: 'Zahlungsmethoden',
        order_history: 'Bestellverlauf',
        help_support: 'Hilfe & Support',
        logout: 'Abmelden',
        login: 'Anmelden',
        register: 'Registrieren',
        login_title: 'Anmelden',
        login_description: 'Geben Sie Ihre Anmeldedaten ein',
        email: 'E-Mail',
        password: 'Passwort',
        remember_me: 'Angemeldet bleiben',
        forgot_password: 'Passwort vergessen?',
        login_button: 'Anmelden',
        or: 'ODER',
        google_login: 'Mit Google fortfahren',
        discord_login: 'Mit Discord fortfahren',
        register_title: 'Konto erstellen',
        register_description: 'Registrieren Sie sich für Premium-Produkte',
        username: 'Benutzername',
        username_or_email: 'Benutzername oder E-Mail',
        phone_number: 'Telefonnummer',
        confirm_password: 'Passwort bestätigen',
        accept_terms: 'Ich akzeptiere die Nutzungsbedingungen und Datenschutzrichtlinie',
        email_newsletter: 'Newsletter abonnieren',
        register_button: 'Konto erstellen',
        google_register: 'Mit Google registrieren',
        discord_register: 'Mit Discord registrieren',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Willkommen in der Zukunft digitaler Produkte',
        feature_1: 'Sofortiger Zugriff auf Produkte',
        feature_2: 'Sichere Zahlungsabwicklung',
        feature_3: 'Premium-Support',
        auto_setup: 'Auto-Setup',
        install: 'Installieren',
        uninstall: 'Deinstallieren',
        update: 'Aktualisieren',
        installed: 'Installiert',
        buy_now: 'Jetzt kaufen',
        select_duration: 'Dauer wählen',
        description: 'Beschreibung',
        specifications: 'Spezifikationen',
        system_requirements: 'Systemanforderungen'
    },
    ru: {
        store: 'Магазин',
        library: 'Библиотека',
        customer_panel: 'Панель клиента',
        discover: 'Обзор',
        browse: 'Просмотр',
        news: 'Новости',
        search_store: 'Поиск в магазине',
        wishlist: 'Избранное',
        cart: 'Корзина',
        show: 'Показать:',
        new_release: 'Новые релизы',
        price_low: 'Цена: от низкой к высокой',
        price_high: 'Цена: от высокой к низкой',
        popular: 'Популярное',
        filters: 'Фильтры',
        reset: 'сбросить',
        keywords: 'Ключевые слова',
        events: 'События',
        price: 'Цена',
        genre: 'Жанр',
        features: 'Особенности',
        types: 'Типы',
        apps: 'Приложения',
        editor: 'Редактор',
        stock_unlimited: 'Неограничено',
        stock_left: 'осталось',
        add_to_cart: 'Добавить в корзину',
        view_details: 'Подробнее',
        my_products: 'Мои продукты',
        all: 'Все',
        purchases: 'Покупки',
        recent: 'Недавние',
        name: 'Название',
        category: 'Категория',
        date: 'Дата',
        product: 'Продукт',
        amount: 'Сумма',
        coupon: 'Купон',
        saved: 'Сэкономлено',
        no_coupon: 'Без купона',
        account_settings: 'Настройки аккаунта',
        preferences: 'Предпочтения',
        payment_methods: 'Способы оплаты',
        order_history: 'История заказов',
        help_support: 'Помощь и поддержка',
        logout: 'Выйти',
        login: 'Войти',
        register: 'Регистрация',
        login_title: 'Вход',
        login_description: 'Введите данные для входа',
        email: 'Электронная почта',
        password: 'Пароль',
        remember_me: 'Запомнить меня',
        forgot_password: 'Забыли пароль?',
        login_button: 'Войти',
        or: 'ИЛИ',
        google_login: 'Продолжить с Google',
        discord_login: 'Продолжить с Discord',
        register_title: 'Создать аккаунт',
        register_description: 'Зарегистрируйтесь для доступа к премиум продуктам',
        username: 'Имя пользователя',
        username_or_email: 'Имя пользователя или Email',
        phone_number: 'Номер телефона',
        confirm_password: 'Подтвердите пароль',
        accept_terms: 'Я принимаю Условия использования и Политику конфиденциальности',
        email_newsletter: 'Подписаться на рассылку',
        register_button: 'Создать аккаунт',
        google_register: 'Зарегистрироваться через Google',
        discord_register: 'Зарегистрироваться через Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Добро пожаловать в будущее цифровых продуктов',
        feature_1: 'Мгновенный доступ к продуктам',
        feature_2: 'Безопасная обработка платежей',
        feature_3: 'Премиум поддержка',
        auto_setup: 'Авто-установка',
        install: 'Установить',
        uninstall: 'Удалить',
        update: 'Обновить',
        installed: 'Установлено',
        buy_now: 'Купить сейчас',
        select_duration: 'Выберите срок',
        description: 'Описание',
        specifications: 'Характеристики',
        system_requirements: 'Системные требования'
    },
    fr: {
        store: 'Boutique',
        library: 'Bibliothèque',
        customer_panel: 'Panneau client',
        discover: 'Découvrir',
        browse: 'Parcourir',
        news: 'Actualités',
        search_store: 'Rechercher dans la boutique',
        wishlist: 'Liste de souhaits',
        cart: 'Panier',
        show: 'Afficher:',
        new_release: 'Nouvelles sorties',
        price_low: 'Prix: Croissant',
        price_high: 'Prix: Décroissant',
        popular: 'Populaire',
        filters: 'Filtres',
        reset: 'réinitialiser',
        keywords: 'Mots-clés',
        events: 'Événements',
        price: 'Prix',
        genre: 'Genre',
        features: 'Fonctionnalités',
        types: 'Types',
        apps: 'Applications',
        editor: 'Éditeur',
        stock_unlimited: 'Illimité',
        stock_left: 'restant',
        add_to_cart: 'Ajouter au panier',
        view_details: 'Voir les détails',
        my_products: 'Mes produits',
        all: 'Tous',
        purchases: 'Achats',
        recent: 'Récent',
        name: 'Nom',
        category: 'Catégorie',
        date: 'Date',
        product: 'Produit',
        amount: 'Montant',
        coupon: 'Coupon',
        saved: 'Économisé',
        no_coupon: 'Pas de coupon',
        account_settings: 'Paramètres du compte',
        preferences: 'Préférences',
        payment_methods: 'Méthodes de paiement',
        order_history: 'Historique des commandes',
        help_support: 'Aide et support',
        logout: 'Se déconnecter',
        login: 'Connexion',
        register: 'Inscription',
        login_title: 'Se connecter',
        login_description: 'Entrez vos identifiants',
        email: 'E-mail',
        password: 'Mot de passe',
        remember_me: 'Se souvenir de moi',
        forgot_password: 'Mot de passe oublié?',
        login_button: 'Se connecter',
        or: 'OU',
        google_login: 'Continuer avec Google',
        discord_login: 'Continuer avec Discord',
        register_title: 'Créer un compte',
        register_description: 'Inscrivez-vous pour accéder aux produits premium',
        username: 'Nom d\'utilisateur',
        username_or_email: 'Nom d\'utilisateur ou Email',
        phone_number: 'Numéro de téléphone',
        confirm_password: 'Confirmer le mot de passe',
        accept_terms: 'J\'accepte les Conditions d\'utilisation et la Politique de confidentialité',
        email_newsletter: 'S\'abonner à la newsletter',
        register_button: 'Créer un compte',
        google_register: 'S\'inscrire avec Google',
        discord_register: 'S\'inscrire avec Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Bienvenue dans le futur des produits numériques',
        feature_1: 'Accès instantané aux produits',
        feature_2: 'Traitement des paiements sécurisé',
        feature_3: 'Support premium',
        auto_setup: 'Configuration automatique',
        install: 'Installer',
        uninstall: 'Désinstaller',
        update: 'Mettre à jour',
        installed: 'Installé',
        buy_now: 'Acheter maintenant',
        select_duration: 'Sélectionner la durée',
        description: 'Description',
        specifications: 'Spécifications',
        system_requirements: 'Configuration requise'
    },
    es: {
        store: 'Tienda',
        library: 'Biblioteca',
        customer_panel: 'Panel de cliente',
        discover: 'Descubrir',
        browse: 'Navegar',
        news: 'Noticias',
        search_store: 'Buscar en la tienda',
        wishlist: 'Lista de deseos',
        cart: 'Carrito',
        show: 'Mostrar:',
        new_release: 'Nuevo lanzamiento',
        price_low: 'Precio: Bajo a Alto',
        price_high: 'Precio: Alto a Bajo',
        popular: 'Más popular',
        filters: 'Filtros',
        reset: 'restablecer',
        keywords: 'Palabras clave',
        events: 'Eventos',
        price: 'Precio',
        genre: 'Género',
        features: 'Características',
        types: 'Tipos',
        apps: 'Aplicaciones',
        editor: 'Editor',
        stock_unlimited: 'Ilimitado',
        stock_left: 'restante',
        add_to_cart: 'Añadir al carrito',
        view_details: 'Ver detalles',
        my_products: 'Mis productos',
        all: 'Todos',
        purchases: 'Compras',
        recent: 'Reciente',
        name: 'Nombre',
        category: 'Categoría',
        date: 'Fecha',
        product: 'Producto',
        amount: 'Cantidad',
        coupon: 'Cupón',
        saved: 'Ahorrado',
        no_coupon: 'Sin cupón',
        account_settings: 'Configuración de cuenta',
        preferences: 'Preferencias',
        payment_methods: 'Métodos de pago',
        order_history: 'Historial de pedidos',
        help_support: 'Ayuda y soporte',
        logout: 'Cerrar sesión',
        login: 'Iniciar sesión',
        register: 'Registrarse',
        login_title: 'Iniciar sesión',
        login_description: 'Ingrese sus credenciales',
        email: 'Correo electrónico',
        password: 'Contraseña',
        remember_me: 'Recuérdame',
        forgot_password: '¿Olvidaste tu contraseña?',
        login_button: 'Iniciar sesión',
        or: 'O',
        google_login: 'Continuar con Google',
        discord_login: 'Continuar con Discord',
        register_title: 'Crear cuenta',
        register_description: 'Regístrate para acceder a productos premium',
        username: 'Nombre de usuario',
        username_or_email: 'Nombre de usuario o Email',
        phone_number: 'Número de teléfono',
        confirm_password: 'Confirmar contraseña',
        accept_terms: 'Acepto los Términos de servicio y la Política de privacidad',
        email_newsletter: 'Suscribirse al boletín',
        register_button: 'Crear cuenta',
        google_register: 'Registrarse con Google',
        discord_register: 'Registrarse con Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Bienvenido al futuro de los productos digitales',
        feature_1: 'Acceso instantáneo a productos',
        feature_2: 'Procesamiento de pagos seguro',
        feature_3: 'Soporte premium',
        auto_setup: 'Configuración automática',
        install: 'Instalar',
        uninstall: 'Desinstalar',
        update: 'Actualizar',
        installed: 'Instalado',
        buy_now: 'Comprar ahora',
        select_duration: 'Seleccionar duración',
        description: 'Descripción',
        specifications: 'Especificaciones',
        system_requirements: 'Requisitos del sistema'
    },
    it: {
        store: 'Negozio',
        library: 'Biblioteca',
        customer_panel: 'Pannello cliente',
        discover: 'Scopri',
        browse: 'Sfoglia',
        news: 'Notizie',
        search_store: 'Cerca nel negozio',
        wishlist: 'Lista dei desideri',
        cart: 'Carrello',
        show: 'Mostra:',
        new_release: 'Nuove uscite',
        price_low: 'Prezzo: dal più basso',
        price_high: 'Prezzo: dal più alto',
        popular: 'Più popolare',
        filters: 'Filtri',
        reset: 'ripristina',
        keywords: 'Parole chiave',
        events: 'Eventi',
        price: 'Prezzo',
        genre: 'Genere',
        features: 'Caratteristiche',
        types: 'Tipi',
        apps: 'Applicazioni',
        editor: 'Editor',
        stock_unlimited: 'Illimitato',
        stock_left: 'rimasti',
        add_to_cart: 'Aggiungi al carrello',
        view_details: 'Vedi dettagli',
        my_products: 'I miei prodotti',
        all: 'Tutti',
        purchases: 'Acquisti',
        recent: 'Recenti',
        name: 'Nome',
        category: 'Categoria',
        date: 'Data',
        product: 'Prodotto',
        amount: 'Importo',
        coupon: 'Coupon',
        saved: 'Risparmiato',
        no_coupon: 'Nessun coupon',
        account_settings: 'Impostazioni account',
        preferences: 'Preferenze',
        payment_methods: 'Metodi di pagamento',
        order_history: 'Cronologia ordini',
        help_support: 'Aiuto e supporto',
        logout: 'Esci',
        login: 'Accedi',
        register: 'Registrati',
        login_title: 'Accedi',
        login_description: 'Inserisci le tue credenziali',
        email: 'Email',
        password: 'Password',
        remember_me: 'Ricordami',
        forgot_password: 'Password dimenticata?',
        login_button: 'Accedi',
        or: 'OPPURE',
        google_login: 'Continua con Google',
        discord_login: 'Continua con Discord',
        register_title: 'Crea account',
        register_description: 'Registrati per accedere ai prodotti premium',
        username: 'Nome utente',
        username_or_email: 'Nome utente o Email',
        phone_number: 'Numero di telefono',
        confirm_password: 'Conferma password',
        accept_terms: 'Accetto i Termini di servizio e la Privacy Policy',
        email_newsletter: 'Iscriviti alla newsletter',
        register_button: 'Crea account',
        google_register: 'Registrati con Google',
        discord_register: 'Registrati con Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Benvenuto nel futuro dei prodotti digitali',
        feature_1: 'Accesso istantaneo ai prodotti',
        feature_2: 'Elaborazione pagamenti sicura',
        feature_3: 'Supporto premium',
        auto_setup: 'Configurazione automatica',
        install: 'Installa',
        uninstall: 'Disinstalla',
        update: 'Aggiorna',
        installed: 'Installato',
        buy_now: 'Acquista ora',
        select_duration: 'Seleziona durata',
        description: 'Descrizione',
        specifications: 'Specifiche',
        system_requirements: 'Requisiti di sistema'
    },
    pt: {
        store: 'Loja',
        library: 'Biblioteca',
        customer_panel: 'Painel do cliente',
        discover: 'Descobrir',
        browse: 'Navegar',
        news: 'Notícias',
        search_store: 'Pesquisar na loja',
        wishlist: 'Lista de desejos',
        cart: 'Carrinho',
        show: 'Mostrar:',
        new_release: 'Novo lançamento',
        price_low: 'Preço: Menor para Maior',
        price_high: 'Preço: Maior para Menor',
        popular: 'Mais popular',
        filters: 'Filtros',
        reset: 'redefinir',
        keywords: 'Palavras-chave',
        events: 'Eventos',
        price: 'Preço',
        genre: 'Gênero',
        features: 'Recursos',
        types: 'Tipos',
        apps: 'Aplicativos',
        editor: 'Editor',
        stock_unlimited: 'Ilimitado',
        stock_left: 'restante',
        add_to_cart: 'Adicionar ao carrinho',
        view_details: 'Ver detalhes',
        my_products: 'Meus produtos',
        all: 'Todos',
        purchases: 'Compras',
        recent: 'Recente',
        name: 'Nome',
        category: 'Categoria',
        date: 'Data',
        product: 'Produto',
        amount: 'Valor',
        coupon: 'Cupom',
        saved: 'Economizado',
        no_coupon: 'Sem cupom',
        account_settings: 'Configurações da conta',
        preferences: 'Preferências',
        payment_methods: 'Métodos de pagamento',
        order_history: 'Histórico de pedidos',
        help_support: 'Ajuda e suporte',
        logout: 'Sair',
        login: 'Entrar',
        register: 'Registrar',
        login_title: 'Entrar',
        login_description: 'Insira suas credenciais',
        email: 'E-mail',
        password: 'Senha',
        remember_me: 'Lembrar de mim',
        forgot_password: 'Esqueceu a senha?',
        login_button: 'Entrar',
        or: 'OU',
        google_login: 'Continuar com Google',
        discord_login: 'Continuar com Discord',
        register_title: 'Criar conta',
        register_description: 'Cadastre-se para acessar produtos premium',
        username: 'Nome de usuário',
        username_or_email: 'Nome de usuário ou Email',
        phone_number: 'Número de telefone',
        confirm_password: 'Confirmar senha',
        accept_terms: 'Aceito os Termos de Serviço e Política de Privacidade',
        email_newsletter: 'Assinar newsletter',
        register_button: 'Criar conta',
        google_register: 'Cadastrar com Google',
        discord_register: 'Cadastrar com Discord',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'Bem-vindo ao futuro dos produtos digitais',
        feature_1: 'Acesso instantâneo aos produtos',
        feature_2: 'Processamento de pagamento seguro',
        feature_3: 'Suporte premium',
        auto_setup: 'Configuração automática',
        install: 'Instalar',
        uninstall: 'Desinstalar',
        update: 'Atualizar',
        installed: 'Instalado',
        buy_now: 'Comprar agora',
        select_duration: 'Selecionar duração',
        description: 'Descrição',
        specifications: 'Especificações',
        system_requirements: 'Requisitos do sistema'
    },
    ja: {
        store: 'ストア',
        library: 'ライブラリ',
        customer_panel: '顧客パネル',
        discover: '発見',
        browse: '閲覧',
        news: 'ニュース',
        search_store: 'ストアを検索',
        wishlist: 'ウィッシュリスト',
        cart: 'カート',
        show: '表示:',
        new_release: '新着',
        price_low: '価格: 安い順',
        price_high: '価格: 高い順',
        popular: '人気',
        filters: 'フィルター',
        reset: 'リセット',
        keywords: 'キーワード',
        events: 'イベント',
        price: '価格',
        genre: 'ジャンル',
        features: '機能',
        types: 'タイプ',
        apps: 'アプリ',
        editor: 'エディター',
        stock_unlimited: '無制限',
        stock_left: '残り',
        add_to_cart: 'カートに追加',
        view_details: '詳細を表示',
        my_products: 'マイ製品',
        all: 'すべて',
        purchases: '購入履歴',
        recent: '最近',
        name: '名前',
        category: 'カテゴリー',
        date: '日付',
        product: '製品',
        amount: '金額',
        coupon: 'クーポン',
        saved: '節約',
        no_coupon: 'クーポンなし',
        account_settings: 'アカウント設定',
        preferences: '設定',
        payment_methods: '支払い方法',
        order_history: '注文履歴',
        help_support: 'ヘルプとサポート',
        logout: 'ログアウト',
        login: 'ログイン',
        register: '登録',
        login_title: 'サインイン',
        login_description: '認証情報を入力してください',
        email: 'メール',
        password: 'パスワード',
        remember_me: 'ログイン状態を保持',
        forgot_password: 'パスワードをお忘れですか？',
        login_button: 'サインイン',
        or: 'または',
        google_login: 'Googleで続ける',
        discord_login: 'Discordで続ける',
        register_title: 'アカウント作成',
        register_description: 'プレミアム製品にアクセスするために登録',
        username: 'ユーザー名',
        username_or_email: 'ユーザー名またはメール',
        phone_number: '電話番号',
        confirm_password: 'パスワード確認',
        accept_terms: '利用規約とプライバシーポリシーに同意します',
        email_newsletter: 'ニュースレターを購読',
        register_button: 'アカウント作成',
        google_register: 'Googleで登録',
        discord_register: 'Discordで登録',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: 'デジタル製品の未来へようこそ',
        feature_1: '製品への即時アクセス',
        feature_2: '安全な支払い処理',
        feature_3: 'プレミアムサポート',
        auto_setup: '自動セットアップ',
        install: 'インストール',
        uninstall: 'アンインストール',
        update: '更新',
        installed: 'インストール済み',
        buy_now: '今すぐ購入',
        select_duration: '期間を選択',
        description: '説明',
        specifications: '仕様',
        system_requirements: 'システム要件'
    },
    ko: {
        store: '스토어',
        library: '라이브러리',
        customer_panel: '고객 패널',
        discover: '발견',
        browse: '찾아보기',
        news: '뉴스',
        search_store: '스토어 검색',
        wishlist: '위시리스트',
        cart: '장바구니',
        show: '표시:',
        new_release: '신규 출시',
        price_low: '가격: 낮은순',
        price_high: '가격: 높은순',
        popular: '인기',
        filters: '필터',
        reset: '재설정',
        keywords: '키워드',
        events: '이벤트',
        price: '가격',
        genre: '장르',
        features: '기능',
        types: '유형',
        apps: '앱',
        editor: '편집기',
        stock_unlimited: '무제한',
        stock_left: '남음',
        add_to_cart: '장바구니에 추가',
        view_details: '세부정보 보기',
        my_products: '내 제품',
        all: '전체',
        purchases: '구매 내역',
        recent: '최근',
        name: '이름',
        category: '카테고리',
        date: '날짜',
        product: '제품',
        amount: '금액',
        coupon: '쿠폰',
        saved: '절약',
        no_coupon: '쿠폰 없음',
        account_settings: '계정 설정',
        preferences: '환경설정',
        payment_methods: '결제 수단',
        order_history: '주문 내역',
        help_support: '도움말 및 지원',
        logout: '로그아웃',
        login: '로그인',
        register: '등록',
        login_title: '로그인',
        login_description: '자격 증명을 입력하세요',
        email: '이메일',
        password: '비밀번호',
        remember_me: '로그인 상태 유지',
        forgot_password: '비밀번호를 잊으셨나요?',
        login_button: '로그인',
        or: '또는',
        google_login: 'Google로 계속하기',
        discord_login: 'Discord로 계속하기',
        register_title: '계정 생성',
        register_description: '프리미엄 제품 액세스를 위한 가입',
        username: '사용자 이름',
        username_or_email: '사용자 이름 또는 이메일',
        phone_number: '전화번호',
        confirm_password: '비밀번호 확인',
        accept_terms: '서비스 약관 및 개인정보 보호정책에 동의합니다',
        email_newsletter: '뉴스레터 구독',
        register_button: '계정 생성',
        google_register: 'Google로 가입',
        discord_register: 'Discord로 가입',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: '디지털 제품의 미래에 오신 것을 환영합니다',
        feature_1: '제품에 즉시 액세스',
        feature_2: '안전한 결제 처리',
        feature_3: '프리미엄 지원',
        auto_setup: '자동 설정',
        install: '설치',
        uninstall: '제거',
        update: '업데이트',
        installed: '설치됨',
        buy_now: '지금 구매',
        select_duration: '기간 선택',
        description: '설명',
        specifications: '사양',
        system_requirements: '시스템 요구사항'
    },
    zh: {
        store: '商店',
        library: '库',
        customer_panel: '客户面板',
        discover: '发现',
        browse: '浏览',
        news: '新闻',
        search_store: '搜索商店',
        wishlist: '愿望清单',
        cart: '购物车',
        show: '显示:',
        new_release: '新发布',
        price_low: '价格: 从低到高',
        price_high: '价格: 从高到低',
        popular: '最受欢迎',
        filters: '筛选',
        reset: '重置',
        keywords: '关键词',
        events: '活动',
        price: '价格',
        genre: '类型',
        features: '特性',
        types: '类型',
        apps: '应用',
        editor: '编辑器',
        stock_unlimited: '无限',
        stock_left: '剩余',
        add_to_cart: '添加到购物车',
        view_details: '查看详情',
        my_products: '我的产品',
        all: '全部',
        purchases: '购买记录',
        recent: '最近',
        name: '名称',
        category: '类别',
        date: '日期',
        product: '产品',
        amount: '金额',
        coupon: '优惠券',
        saved: '节省',
        no_coupon: '无优惠券',
        account_settings: '账户设置',
        preferences: '偏好设置',
        payment_methods: '支付方式',
        order_history: '订单历史',
        help_support: '帮助与支持',
        logout: '登出',
        login: '登录',
        register: '注册',
        login_title: '登录',
        login_description: '输入您的凭据',
        email: '电子邮件',
        password: '密码',
        remember_me: '记住我',
        forgot_password: '忘记密码？',
        login_button: '登录',
        or: '或',
        google_login: '使用Google继续',
        discord_login: '使用Discord继续',
        register_title: '创建账户',
        register_description: '注册以访问高级产品',
        username: '用户名',
        username_or_email: '用户名或邮箱',
        phone_number: '电话号码',
        confirm_password: '确认密码',
        accept_terms: '我接受服务条款和隐私政策',
        email_newsletter: '订阅电子邮件通讯',
        register_button: '创建账户',
        google_register: '使用Google注册',
        discord_register: '使用Discord注册',
        store_name: 'Rickware - Labs - Launcher',
        auth_welcome: '欢迎来到数字产品的未来',
        feature_1: '即时访问产品',
        feature_2: '安全的支付处理',
        feature_3: '高级支持',
        auto_setup: '自动设置',
        install: '安装',
        uninstall: '卸载',
        update: '更新',
        installed: '已安装',
        buy_now: '立即购买',
        select_duration: '选择时长',
        description: '描述',
        specifications: '规格',
        system_requirements: '系统要求'
    }
};

const languageNames = {
    en: 'English',
    de: 'Deutsch',
    ru: 'Русский',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    pt: 'Português',
    ja: '日本語',
    ko: '한국어',
    zh: '中文'
};


function translate(key) {
    const t = translations[currentLanguage] || translations['en'];
    return t[key] || translations['en'][key] || key;
}

function updateLanguage() {
    document.querySelectorAll('[data-translate]').forEach(function(el) {
        var key = el.getAttribute('data-translate');
        var val = translate(key);
        if (el.tagName === 'INPUT') {
            el.placeholder = val;
        } else {
            el.textContent = val;
        }
    });
}

function updateCartBadge() {
    var badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = cart.length;
}

function siteBaseUrl() {
    var script = document.querySelector('script[src*="js/main.js"]');
    if (script && script.src) return script.src.replace(/js\/main\.js.*$/, '');
    return './';
}

async function loadConfig() {
    try {
        var res = await fetch(siteBaseUrl() + 'config/config.json', { cache: 'no-store' });
        if (res.ok) config = await res.json();
    } catch(e) {
        config = {};
    }
    return config;
}

var PERMISSION_RANKS = { 'user': 0, 'vip': 1, 'partner': 2, 'beta': 3, 'unlockall': 4, 'admin': 5, 'owner': 6 };

function normalizePermissionKey(value) {
    return String(value || 'User').toLowerCase().replace(/\s+/g, '');
}

function getCurrentPermissionRank() {
    if (!currentUser) return 0;
    var candidates = [];
    [currentUser.account_permissions, currentUser.account_type, currentUser.role].forEach(function(value) {
        if (Array.isArray(value)) candidates = candidates.concat(value);
        else if (value) candidates.push(value);
    });
    var highest = 0;
    candidates.forEach(function(value) {
        var rank = PERMISSION_RANKS[normalizePermissionKey(value)];
        if (rank !== undefined && rank > highest) highest = rank;
    });
    return highest;
}

function meetsRequiredPermission(requiredPermission) {
    if (!requiredPermission) return true;
    var requiredRank = PERMISSION_RANKS[normalizePermissionKey(requiredPermission)];
    if (requiredRank === undefined) return true;
    return getCurrentPermissionRank() >= requiredRank;
}

function cfgGatedDisplayValue(el) {
    if (el.classList.contains('nav-item')) return 'flex';
    if (el.classList.contains('download-launcher-btn')) return 'flex';
    if (el.classList.contains('discord-join-btn')) return 'flex';
    if (el.classList.contains('top-tab')) return 'inline-block';
    return '';
}

function applyConfigVisibility() {
    if (!config) config = {};
    var gatedEls = document.querySelectorAll('.cfg-gated[data-cfg-key]');
    gatedEls.forEach(function(el) {
        var key = el.getAttribute('data-cfg-key');
        var enabled = config[key] !== false;
        var requiredPermission = config[key + '_required_permissions'];
        var allowed = enabled && meetsRequiredPermission(requiredPermission);
        el.classList.remove('cfg-gated');
        el.style.display = allowed ? cfgGatedDisplayValue(el) : 'none';
    });
}

function applyConfigDefaults() {
    if (!config) return;
    var perPageSel = document.getElementById('perPageSelect');
    if (perPageSel && config.default_per_page) {
        var perPageVal = String(config.default_per_page);
        var hasOption = Array.prototype.some.call(perPageSel.options, function(o) { return o.value === perPageVal; });
        if (hasOption) perPageSel.value = perPageVal;
    }
    var sortSel = document.getElementById('sortSelect');
    if (sortSel && config.default_product_filter) {
        var matchedOption = Array.prototype.find.call(sortSel.options, function(o) {
            var label = window.RWLI18n ? RWLI18n.source(o) : o.textContent;
            return label.trim() === config.default_product_filter;
        });
        if (matchedOption) sortSel.value = matchedOption.value;
    }
}

async function fetchFullUser(token) {
    try {
        var res = await fetch(apiUrl('/api/user'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            var data = await res.json();
            return data.account || data;
        }
    } catch(e) {}
    return null;
}

async function getCurrentUser() {
    var token = sessionStorage.getItem('rickware_token');
    if (!token) return null;
    try {
        var stored = sessionStorage.getItem('rickware_user');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
}

function getAccountData() {
    try {
        var stored = sessionStorage.getItem('rickware_user');
        return stored ? JSON.parse(stored) : null;
    } catch(e) { return null; }
}

async function checkLoginStatus() {
    var authButtons = document.getElementById('authButtons');
    var userProfileBtn = document.getElementById('userProfileBtn');
    var token = RWL.getToken();
    if (token && token.split('.').length === 3) {
        var fullUser = await fetchFullUser(token);
        var resolvedUser = fullUser || (RWL.getToken() ? getAccountData() : null);
        if (resolvedUser) {
            if (fullUser) sessionStorage.setItem('rickware_user', JSON.stringify(fullUser));
            currentUser = resolvedUser;
            updateUserProfile(resolvedUser);
            syncAccountPreferences(resolvedUser);
            if (authButtons) authButtons.style.display = 'none';
            if (userProfileBtn) userProfileBtn.style.display = 'flex';
            return;
        }
    }
    if (token && !RWL.getToken()) RWL.clearSession();
    if (window.RWLTheme && RWLTheme.current()) RWLTheme.clear();
    currentUser = null;
    if (authButtons) authButtons.style.display = 'flex';
    if (userProfileBtn) userProfileBtn.style.display = 'none';
}

function getAccountTypeBadgeStyle(accountType) {
    var type = (accountType || 'User').toLowerCase();
    if (type === 'owner') return 'background:rgba(255,215,0,0.15);color:#ffd700;border:1px solid rgba(255,215,0,0.4);';
    if (type === 'admin') return 'background:rgba(244,67,54,0.15);color:#f44336;border:1px solid rgba(244,67,54,0.4);';
    if (type === 'beta') return 'background:rgba(155,0,204,0.15);color:#c97eff;border:1px solid rgba(155,0,204,0.4);';
    if (type === 'partner') return 'background:rgba(0,188,212,0.15);color:#00bcd4;border:1px solid rgba(0,188,212,0.4);';
    return 'background:rgba(155,0,204,0.12);color:#b87fff;border:1px solid rgba(155,0,204,0.3);';
}

function applyNameColor(el, cosmetics, fallback) {
    ['background-image', 'background-size', '-webkit-background-clip', 'background-clip', '-webkit-text-fill-color', 'animation', 'color'].forEach(function(property) {
        el.style.removeProperty(property);
    });
    RWL.nameColorStyle(cosmetics || {}, fallback).split(';').forEach(function(rule) {
        var separator = rule.indexOf(':');
        if (separator > 0) el.style.setProperty(rule.slice(0, separator).trim(), rule.slice(separator + 1).trim());
    });
}

function userProfileImageSrc(user) {
    if (user && user.profile_picture_url && /^https?:\/\//.test(user.profile_picture_url)) return user.profile_picture_url;
    if (user && user.profile_picture_base64) return 'data:image/png;base64,' + user.profile_picture_base64;
    if (user && user.profile_picture) return profilePicUrl(user.profile_picture);
    return siteBaseUrl() + 'images/main/logo.webp';
}

function syncAccountPreferences(user) {
    if (!user) return;
    if (window.RWLTheme) RWLTheme.sync(user.equipped_cosmetics || {});
    if (window.RWLI18n) {
        var accountLanguage = user.preferred_language || 'en';
        if (accountLanguage !== RWLI18n.language()) {
            if (RWLI18n.useAccountLanguage) RWLI18n.useAccountLanguage(accountLanguage);
            else RWLI18n.setLanguage(accountLanguage);
        }
    }
}

function applyFrameTo(element, data) {
    if (!element) return;
    Array.prototype.slice.call(element.classList).forEach(function(name) {
        if (name === 'rwl-frame' || name.indexOf('rwl-frame-') === 0) element.classList.remove(name);
    });
    ['--rwl-keep', '--rwl-f1', '--rwl-f2', '--rwl-f3', '--rwl-fs', '--rwl-fw'].forEach(function(property) {
        element.style.removeProperty(property);
    });
    if (!data || !data.effect) return;
    RWL.frameClasses(data).trim().split(/\s+/).forEach(function(name) { if (name) element.classList.add(name); });
    RWL.frameStyle(data).split(';').forEach(function(rule) {
        var separator = rule.indexOf(':');
        if (separator > 0) element.style.setProperty(rule.slice(0, separator).trim(), rule.slice(separator + 1).trim());
    });
}

function updateUserProfile(user) {
    var fallbackColor = (config && config.default_name_color) ? config.default_name_color : '#ffffff';
    var cosmetics = user.equipped_cosmetics || {};
    applyFrameTo(document.getElementById('userProfileBtn'), cosmetics.nameplate_outline_data);
    applyFrameTo(document.getElementById('profileHeaderNameplate'), cosmetics.nameplate_outline_data);
    document.querySelectorAll('#usernameDisplay, #usernameDisplaySidebar, .cp-profile-username').forEach(function(el) {
        el.textContent = user.username || 'Guest';
        applyNameColor(el, cosmetics, fallbackColor);
    });
    document.querySelectorAll('#userTypeSidebar').forEach(function(el) {
        el.innerHTML = '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:1px;line-height:1;">Acc Type</span><span>' + escHtml(user.account_type || 'User') + '</span>';
        el.setAttribute('style', getAccountTypeBadgeStyle(user.account_type) + 'flex-direction:column;align-items:center;padding:3px 10px;');
    });
    var sidebarPerms = document.getElementById('userPermsSidebar');
    if (sidebarPerms) {
        var perms2 = user.account_permissions;
        if (perms2 && perms2 !== '' && perms2 !== 'none' && perms2 !== null) {
            var perms2Text = Array.isArray(perms2) ? perms2.join(', ') : perms2;
            sidebarPerms.innerHTML = '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:1px;line-height:1;">Acc Perm</span><span>' + escHtml(perms2Text) + '</span>';
            sidebarPerms.setAttribute('style', 'background:rgba(99,0,138,0.22);color:#c97eff;border:1px solid rgba(155,0,204,0.45);display:inline-flex;flex-direction:column;align-items:center;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;');
        } else {
            sidebarPerms.style.display = 'none';
        }
    }
    var profileSrc = userProfileImageSrc(user);
    document.querySelectorAll('#profileImage, #profileImageLarge').forEach(function(img) {
        img.src = profileSrc;
    });
    var nameplateSrc = userNameplateSrc(cosmetics);
    document.querySelectorAll('#nameplateBg, #nameplateBgLarge').forEach(function(nameplateBg) {
        nameplateBg.style.filter = RWL.mediaFilterValue(cosmetics && cosmetics.nameplate_filter);
        if (nameplateBg.getAttribute('data-src') !== nameplateSrc) {
            nameplateBg.setAttribute('data-src', nameplateSrc);
            nameplateBg.src = nameplateSrc;
            nameplateBg.load();
            nameplateBg.play().catch(function(){});
        }
    });
    var decorationSrc = userDecorationSrc(cosmetics);
    document.querySelectorAll('#avatarDecoration, #avatarDecorationLarge').forEach(function(avatarDecoration) {
        avatarDecoration.style.filter = RWL.mediaFilterValue(cosmetics && cosmetics.avatar_decoration_filter);
        if (decorationSrc) {
            if (avatarDecoration.getAttribute('data-src') !== decorationSrc) {
                avatarDecoration.setAttribute('data-src', decorationSrc);
                avatarDecoration.src = decorationSrc;
            }
            avatarDecoration.style.display = 'block';
        } else {
            avatarDecoration.style.display = 'none';
        }
    });
    var coins = user.user_discord_user_coin_amount;
    if (coins !== undefined && coins !== null) {
        setLabCoinsBalance(coins);
    }
    var badge = document.getElementById('accountTypeBadge');
    if (badge) {
        badge.innerHTML = '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:1px;line-height:1;">Acc Type</span><span>' + escHtml(user.account_type || 'User') + '</span>';
        badge.setAttribute('style', getAccountTypeBadgeStyle(user.account_type) + 'display:inline-flex;flex-direction:column;align-items:center;padding:3px 13px;');
    }
    var permBadge = document.getElementById('accountPermsBadge');
    if (permBadge) {
        var perms = user.account_permissions;
        if (perms && perms !== '' && perms !== 'none' && perms !== null) {
            var permsText = Array.isArray(perms) ? perms.join(', ') : perms;
            permBadge.innerHTML = '<span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:1px;line-height:1;">Acc Perm</span><span>' + escHtml(permsText) + '</span>';
            permBadge.style.cssText = 'background:rgba(99,0,138,0.22);color:#c97eff;border:1px solid rgba(155,0,204,0.45);display:inline-flex;flex-direction:column;align-items:center;padding:3px 13px;border-radius:20px;font-size:12px;font-weight:700;';
        } else {
            permBadge.style.display = 'none';
        }
    }
}

async function loginUser(usernameOrEmail, password) {
    try {
        var res = await fetch(apiUrl('/api/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameOrEmail,
                password: password,
                device_key: RWL.deviceKey(),
                client: RWL.clientKind(),
                user_agent: navigator.userAgent || null,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
                fingerprint: (navigator.userAgent + navigator.language + screen.width + screen.height) || null,
                browser: (function() {
                    var ua = navigator.userAgent;
                    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
                    if (ua.indexOf('Firefox') > -1) return 'Firefox';
                    if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
                    if (ua.indexOf('Edg') > -1) return 'Edge';
                    if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) return 'Opera';
                    return 'Unknown';
                })()
            })
        });
        if (res.ok) {
            var data = await res.json();
            sessionStorage.setItem('rickware_token', data.token);
            if (data.refresh_token) sessionStorage.setItem('rickware_refresh_token', data.refresh_token);
            if (data.account) {
                sessionStorage.setItem('rickware_user', JSON.stringify(data.account));
                RWL.applySession(data.session);
                return data.account;
            }
            RWL.applySession(data.session);
            var fullUser = await fetchFullUser(data.token);
            if (fullUser) {
                sessionStorage.setItem('rickware_user', JSON.stringify(fullUser));
                return fullUser;
            }
            var decoded = JSON.parse(atob(data.token.split('.')[1]));
            sessionStorage.setItem('rickware_user', JSON.stringify(decoded));
            return decoded;
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner(RWL.errorDetail(errData, 'Invalid credentials'), 'error');
            return null;
        }
    } catch(e) {
        showBanner('Login failed. The server could not be reached, please try again.', 'error');
        return null;
    }
}

async function forgotPassword(identifier) {
    try {
        var res = await fetch(apiUrl('/api/forgot_password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: identifier })
        });
        if (res.ok) {
            showBanner('If the account exists, a reset code has been sent to the registered email.', 'success');
            return true;
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'Failed to send reset code', 'error');
            return false;
        }
    } catch(e) {
        showBanner('Failed to send reset code', 'error');
        return false;
    }
}

async function confirmReset(identifier, code, newPassword) {
    try {
        var res = await fetch(apiUrl('/api/confirm_reset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: identifier, code: code, new_password: newPassword })
        });
        if (res.ok) {
            showBanner('Password reset successfully. You can now log in.', 'success');
            return true;
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'Invalid or expired reset code', 'error');
            return false;
        }
    } catch(e) {
        showBanner('Failed to reset password', 'error');
        return false;
    }
}

async function registerUser(username, email, phone, password) {
    try {
        var res = await fetch(apiUrl('/api/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password, email: email, phone: phone })
        });
        if (res.ok) {
            return await loginUser(username, password);
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner(RWL.errorDetail(errData, 'Registration failed'), 'error');
            return null;
        }
    } catch(e) {
        showBanner('Registration failed. The server could not be reached, please try again.', 'error');
        return null;
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function(el) {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    var target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
}

function setupTabs() {
    var tabs = document.querySelectorAll('.top-tab');
    tabs.forEach(function(btn) {
        btn.addEventListener('click', function() {
            tabs.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var key = btn.getAttribute('data-tab');
            if (key === 'dashboard') { showTab('dashboardTab'); loadDashboard(); }
            else if (key === 'discover') showTab('discoverTab');
            else if (key === 'partner') showTab('partnerTab');
            else if (key === 'github') showTab('githubTab');
            else if (key === 'status') { showTab('statusTab'); renderStatusTab(); }
            else if (key === 'news') showTab('newsTab');
            else if (key === 'qa') showTab('qaTab');
            trackFx('tab', { tab: key });
        });
    });
}

function trackFx(type, detail) {
    try { window.dispatchEvent(new CustomEvent('rwl-fx', { detail: Object.assign({ type: type }, detail || {}) })); } catch (e) {}
}

var dashboardState = { offset: 0, loading: false, query: '', done: false };

function dashboardRankBadge(member) {
    var type = member.account_type || 'User';
    return '<span class="dashboard-type-badge" style="' + getAccountTypeBadgeStyle(type) + '">' + escHtml(type) + '</span>';
}

function buildDashboardCard(member) {
    var initials = (member.username || '?').split('_').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2) || (member.username || '?')[0].toUpperCase();
    var avatar = member.profile_picture
        ? '<img src="' + escHtml(profilePicUrl(member.profile_picture)) + '" class="rwl-plate-avatar-img" alt="" decoding="async" loading="lazy" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><div class="rwl-plate-avatar-fallback" style="display:none;">' + escHtml(initials) + '</div>'
        : '<div class="rwl-plate-avatar-fallback">' + escHtml(initials) + '</div>';
    var decorationSrc = userDecorationSrc(member);
    var decorationHtml = decorationSrc ? '<img src="' + escHtml(decorationSrc) + '" alt="" class="rwl-plate-decoration" decoding="async" loading="lazy"' + decorationFilterAttr(member) + '>' : '';
    var permsHtml = (member.account_permissions && member.account_permissions !== '' && member.account_permissions !== 'none')
        ? '<span class="dashboard-perms-badge">' + escHtml(Array.isArray(member.account_permissions) ? member.account_permissions.join(', ') : member.account_permissions) + '</span>' : '';
    var speed = member.nameplate_speed ? parseFloat(member.nameplate_speed) : 1;
    var plateFilter = RWL.mediaFilterStyle(member.nameplate_filter);
    var card = document.createElement('div');
    card.className = 'dashboard-member-card rwl-plate-card' + (member.online ? ' online' : '');
    card.setAttribute('translate', 'no');
    card.setAttribute('data-username', member.username || '');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', (member.username || '') + ' profile');
    card.innerHTML =
        '<div class="rwl-plate' + outlineClasses(member) + '"' + outlineStyleAttr(member) + '>' +
            '<video class="rwl-plate-bg"' + (plateFilter ? ' style="' + escHtml(plateFilter) + '"' : '') + ' muted loop playsinline preload="none" data-rwl-speed="' + (isNaN(speed) ? 1 : speed) + '" data-src="' + escHtml(userNameplateSrc(member)) + '"></video>' +
            '<div class="rwl-plate-avatar">' + avatar + decorationHtml + '<span class="rwl-plate-presence' + (member.online ? ' online' : '') + '"></span></div>' +
            '<div class="rwl-plate-text">' +
                '<span class="rwl-plate-name" style="' + escHtml(userNameStyle(member)) + '">' + escHtml(member.username) + '</span>' +
                '<span class="rwl-plate-badges">' + dashboardRankBadge(member) + permsHtml + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="rwl-plate-meta">' +
            '<span class="dashboard-member-since">' + (member.online ? 'Online now' : (member.member_since ? 'Member since ' + escHtml(member.member_since) : '')) + '</span>' +
            (!member.online && member.last_online ? '<span class="dashboard-last-online" data-rwl-time="' + escHtml(member.last_online) + '">Last online: ' + escHtml(new Date(member.last_online).toLocaleString()) + '</span>' : '') +
        '</div>';
    if (window.RWLSocial && window.RWLSocial.observeCard) window.RWLSocial.observeCard(card);
    return card;
}

async function loadDashboard(reset) {
    var grid = document.getElementById('dashboardGrid');
    if (!grid) return;
    if (reset) { dashboardState = { offset: 0, loading: false, query: dashboardState.query, done: false }; grid.innerHTML = ''; }
    if (dashboardState.loading || dashboardState.done) return;
    dashboardState.loading = true;
    var loadMore = document.getElementById('dashboardLoadMore');
    if (dashboardState.offset === 0) grid.innerHTML = '<div class="news-loading">Loading members...</div>';
    try {
        if (dashboardState.query && dashboardState.query.length >= 2) {
            var found = await RWL.apiRequest('/api/community/search?q=' + encodeURIComponent(dashboardState.query));
            grid.innerHTML = '';
            (found.results || []).forEach(function(member) { grid.appendChild(buildDashboardCard(member)); });
            if (!found.results || !found.results.length) grid.innerHTML = '<div class="status-empty">No members found. Discord details only match accounts with a linked Discord account.</div>';
            dashboardState.done = true;
            if (loadMore) loadMore.style.display = 'none';
            return;
        }
        var data = await RWL.apiRequest('/api/community/members?offset=' + dashboardState.offset + '&limit=60&q=' + encodeURIComponent(dashboardState.query));
        if (dashboardState.offset === 0) {
            grid.innerHTML = '';
            var countEl = document.getElementById('dashboardOnlineCount');
            if (countEl) countEl.innerHTML = '<span class="dashboard-online-dot"></span>' + data.online + ' online · ' + data.total + ' members';
        }
        (data.members || []).forEach(function(member) { grid.appendChild(buildDashboardCard(member)); });
        if (!data.members || !data.members.length) {
            if (dashboardState.offset === 0) grid.innerHTML = '<div class="status-empty">No members found.</div>';
            dashboardState.done = true;
        }
        dashboardState.offset = data.next_offset || dashboardState.offset;
        dashboardState.done = data.next_offset === null;
        if (loadMore) loadMore.style.display = dashboardState.done ? 'none' : 'inline-flex';
    } catch (e) {
        if (dashboardState.offset === 0) grid.innerHTML = '<div class="status-empty">Members could not be loaded.</div>';
    } finally {
        dashboardState.loading = false;
    }
}

function setupDashboard() {
    var search = document.getElementById('dashboardSearch');
    if (search) {
        var debounce = null;
        search.addEventListener('input', function() {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(function() { dashboardState.query = search.value.trim(); loadDashboard(true); }, 300);
        });
    }
    var loadMore = document.getElementById('dashboardLoadMore');
    if (loadMore) loadMore.addEventListener('click', function() { loadDashboard(); });
}

function renderStatusTab() {
    var listEl = document.getElementById('statusList');
    if (!listEl) return;
    if (listEl.dataset.rendered === '1') return;
    if (!productsData || !productsData.products) {
        listEl.innerHTML = '<div class="status-empty">No product data available.</div>';
        return;
    }
    listEl.dataset.rendered = '1';
    var prods = productsData.products;
    var html = '';
    prods.forEach(function(p, i) {
        var title = (p.title || 'Unknown').replace(/^[\u2022\u00b7\-\s]+/, '').trim();
        var version = p.version ? p.version : '';
        var cl = p.change_log ? String(p.change_log).trim() : '';
        var hasChangelog = cl.length > 0 && cl.toLowerCase() !== 'soon' && cl.toLowerCase() !== 'none' && cl.toLowerCase() !== 'n/a';
        var banner = (p.banner || '').toLowerCase();
        var statusKey, statusLabel, statusColor, statusBg, statusBorder, statusGlow;
        var isComingSoon = banner === 'coming soon' || (banner.indexOf('coming soon') >= 0);
        var isMaintenance = banner.indexOf('maintenance') >= 0 || (cl && cl.toLowerCase().indexOf('maintenance') >= 0);
        var isSoon = !isComingSoon && (banner.indexOf('soon') >= 0 || banner.indexOf('update') >= 0 || banner.indexOf('wip') >= 0);
        if (isComingSoon) {
            statusKey = 'outdated';
            statusLabel = 'Coming Soon';
            statusColor = '#ef4444';
            statusBg = 'rgba(239,68,68,0.10)';
            statusBorder = 'rgba(239,68,68,0.28)';
            statusGlow = '#ef4444';
        } else if (isMaintenance || isSoon) {
            statusKey = 'maintenance';
            statusLabel = isMaintenance ? 'Maintenance' : 'Update Soon';
            statusColor = '#f59e0b';
            statusBg = 'rgba(245,158,11,0.10)';
            statusBorder = 'rgba(245,158,11,0.28)';
            statusGlow = '#f59e0b';
        } else {
            statusKey = 'up to date';
            statusLabel = 'Up To Date';
            statusColor = '#22c55e';
            statusBg = 'rgba(34,197,94,0.10)';
            statusBorder = 'rgba(34,197,94,0.28)';
            statusGlow = '#22c55e';
        }
        var delay = (i * 0.045).toFixed(3);
        html += '<div class="status-product-card" style="animation-delay:' + delay + 's">';
        html += '<div class="status-product-left">';
        html += '<div class="status-product-title">' + escHtml(title) + '</div>';
        if (version) html += '<span class="status-product-version">' + escHtml(version) + '</span>';
        if (hasChangelog) {
            html += '<button class="status-changelog-toggle" onclick="toggleStatusChangelog(this)" aria-expanded="false">';
            html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
            html += 'Changelog';
            html += '</button>';
            html += '<div class="status-changelog-body" style="display:none;">';
            var clFormatted = escHtml(cl).replace(/\n/g, '<br>');
            html += clFormatted;
            html += '</div>';
        }
        html += '</div>';
        html += '<div class="status-product-right">';
        html += '<div class="status-badge-pill" style="background:' + statusBg + ';border:1px solid ' + statusBorder + ';color:' + statusColor + ';">';
        html += '<span class="status-pulse-dot" style="background:' + statusGlow + ';box-shadow:0 0 7px ' + statusGlow + ';animation:statusPulse 2.2s ease-in-out infinite ' + delay + 's;"></span>';
        html += escHtml(statusLabel);
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    listEl.innerHTML = html;
}

function setupNavigation() {
    var navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var page = item.getAttribute('data-page');
            if (page === 'labpass') {
                if (!currentUser) {
                    window.location.href = './sites/login_register.html?tab=login';
                    return;
                }
                window.location.href = './sites/lab-pass.html';
                return;
            }
            if (page === 'inventory') {
                if (!currentUser) {
                    window.location.href = './sites/login_register.html?tab=login';
                    return;
                }
                window.location.href = './sites/inventory.html';
                return;
            }
            if (page === 'bazaar') {
                if (!currentUser) {
                    window.location.href = './sites/login_register.html?tab=login';
                    return;
                }
                window.location.href = './sites/bazaar.html';
                return;
            }
            if (page === 'customer' && !currentUser) {
                window.location.href = './sites/login_register.html?tab=login';
                return;
            }
            if (page === 'customer') {
                hideBankPage();
                hideReviewsPage();
                hideSupportPage();
                showCustomerPanel();
                navItems.forEach(function(n) { n.classList.remove('active'); });
                item.classList.add('active');
                return;
            }
            if (page === 'bank') {
                hideReviewsPage();
                showBankPage();
                navItems.forEach(function(n) { n.classList.remove('active'); });
                item.classList.add('active');
                return;
            }
            if (page === 'qa') {
                if (!currentUser) {
                    window.location.href = './sites/login_register.html?tab=login';
                    return;
                }
                window.location.href = './sites/q&a.html';
                return;
            }
            if (page === 'reviews') {
                hideBankPage();
                hideReviewsPage();
                hideSupportPage();
                showReviewsPage();
                navItems.forEach(function(n) { n.classList.remove('active'); });
                item.classList.add('active');
                return;
            }
            if (page === 'forum') {
                hideBankPage();
                hideReviewsPage();
                hideSupportPage();
                hideCustomerPanel();
                showForumPage();
                navItems.forEach(function(n) { n.classList.remove('active'); });
                item.classList.add('active');
                return;
            }
            if (page === 'partner') {
                hideBankPage();
                hideReviewsPage();
                hideSupportPage();
                hideCustomerPanel();
                showTab('partnerTab');
                navItems.forEach(function(n) { n.classList.remove('active'); });
                item.classList.add('active');
                return;
            }
            if (page === 'store') {
                hideBankPage();
                hideReviewsPage();
                hideSupportPage();
                hideCustomerPanel();
                hideForumPage();
                showTab('discoverTab');
                var topTabs = document.querySelectorAll('.top-tab');
                topTabs.forEach(function(b) { b.classList.remove('active'); });
                var discoverBtn = document.querySelector('.top-tab[data-tab="discover"]');
                if (discoverBtn) discoverBtn.classList.add('active');
            }
            navItems.forEach(function(n) { n.classList.remove('active'); });
            item.classList.add('active');
        });
    });
}

var labCoinsBalance = 0;
function getLabCoinsBalance() { return labCoinsBalance; }
function setLabCoinsBalance(v) {
    labCoinsBalance = v;
    var nameplateEl = document.getElementById('nameplateLcAmount');
    if (nameplateEl) nameplateEl.textContent = v + ' LC';
}

async function showBankPage() {
    var content = document.getElementById('content');
    if (!content) return;
    var existing = document.getElementById('bankPageSection');
    if (existing) {
        existing.style.display = '';
        content.querySelectorAll('.tab-content:not(#bankPageSection)').forEach(function(t) { t.style.display = 'none'; });
        return;
    }
    var defaultPackages = [
        { id: 'pack10', coins: 10, bonus: 0, price: 0.50, label: 'Starter', color: '#6a0080' },
        { id: 'pack50', coins: 50, bonus: 5, price: 2.50, label: 'Basic', color: '#7b00a0' },
        { id: 'pack100', coins: 100, bonus: 15, price: 5.00, label: 'Standard', color: '#8e00b8', popular: true },
        { id: 'pack250', coins: 250, bonus: 50, price: 12.50, label: 'Value', color: '#a000d0' },
        { id: 'pack500', coins: 500, bonus: 125, price: 25.00, label: 'Pro', color: '#b200e8' },
        { id: 'pack1000', coins: 1000, bonus: 300, price: 50.00, label: 'Elite', color: '#c000ff' },
        { id: 'pack2000', coins: 2000, bonus: 700, price: 100.00, label: 'Master', color: '#d000ff' },
        { id: 'pack5000', coins: 5000, bonus: 2000, price: 250.00, label: 'Legend', color: '#e000ff' },
        { id: 'pack10000', coins: 10000, bonus: 5000, price: 500.00, label: 'Titan', color: '#f000ff' },
        { id: 'pack25000', coins: 25000, bonus: 15000, price: 1250.00, label: 'God Tier', color: '#ff00ff' }
    ];
    var coinPackages = defaultPackages;
    try {
        var bankRes = await fetch(apiUrl('/api/bank'), { headers: RWL.authHeaders() });
        if (bankRes.ok) {
            var bankData = await bankRes.json();
            if (bankData.lc_usd_rate) window._lcUsdRate = bankData.lc_usd_rate;
            if (bankData.main && bankData.main.lc_balance !== undefined) {
                labCoinsBalance = bankData.main.lc_balance;
            }
            if (bankData.coin_packages && bankData.coin_packages.length > 0) {
                coinPackages = bankData.coin_packages.map(function(p) {
                    return {
                        id: p.id || ('pack' + p.coins),
                        coins: p.coins || 0,
                        bonus: p.bonus || 0,
                        price: p.price || 0,
                        label: p.label || 'Pack',
                        color: p.color || '#c97eff',
                        popular: p.popular || false
                    };
                });
            }
        }
    } catch(e) {}
    content.querySelectorAll('.tab-content').forEach(function(t) { t.style.display = 'none'; });
    var section = document.createElement('section');
    section.id = 'bankPageSection';
    section.className = 'tab-content active';
    var packHtml = coinPackages.map(function(pkg) {
        var total = pkg.coins + pkg.bonus;
        var popularBadge = pkg.popular ? '<div class="bank-pack-popular">Most Popular</div>' : '';
        return '<div class="bank-coin-pack glass-card' + (pkg.popular ? ' bank-pack-featured' : '') + '" data-pack="' + pkg.id + '">' +
            popularBadge +
            '<div class="bank-pack-icon"><img src="./images/main/lc_coin_96.webp" alt="LC" decoding="async" style="width:48px;height:48px;object-fit:contain;" onerror="this.style.display=\'none\'"></div>' +
            '<div class="bank-pack-label">' + pkg.label + '</div>' +
            '<div class="bank-pack-coins">' + total + ' <span>LC</span></div>' +
            (pkg.bonus > 0 ? '<div class="bank-pack-bonus">+' + pkg.bonus + ' bonus coins</div>' : '<div class="bank-pack-bonus">&nbsp;</div>') +
            '<div class="bank-pack-price"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#ffffff 35%,#e0c0ff 50%,#ffffff 65%);">$' + pkg.price.toFixed(2) + '</span></div>' +
            '<button class="bank-pack-btn" onclick="openCoinCheckout(\'' + pkg.id + '\',' + pkg.coins + ',' + pkg.bonus + ',' + pkg.price + ',\'' + pkg.label + '\')">Buy Now</button>' +
        '</div>';
    }).join('');
    section.innerHTML =
        '<div class="bank-page">' +
            '<div style="display:flex;align-items:flex-start;gap:24px;">' +
                '<img src="./images/main/lc_coin_400.webp" alt="Lab Coin" decoding="async" style="width:200px;height:200px;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' +
                '<div class="bank-page-header glass-card" style="flex:1;">' +
                    '<div class="bank-header-left">' +
                        '<h1><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:10px"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 2 7 22 7"/></svg><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Lab Bank</span></h1>' +
                        '<p>Manage your Lab Coins and purchase coin packages</p>' +
                    '</div>' +
                    '<div class="bank-balance-card glass-card">' +
                        '<div class="bank-balance-label">Your Balance</div>' +
                        '<div class="bank-balance-amount" id="bankBalanceDisplay">' + labCoinsBalance + ' <span>LC</span></div>' +
                        '<div class="bank-balance-usd">≈ $' + (labCoinsBalance * currentLcUsdRate()).toFixed(2) + ' USD</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bank-coin-value-banner glass-card">' +
                '<div class="bank-coin-icon-big"><img src="./images/main/lc_coin_96.webp" alt="LC" decoding="async" style="width:40px;height:40px;object-fit:contain;"></div>' +
                '<div>' +
                    '<div class="bank-coin-value-title"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Lab Coin (LC)</span></div>' +
                    '<div class="bank-coin-value-desc">Discord Server XP = <strong style="color:#c97eff">Lab Coins (LC)</strong> &nbsp;|&nbsp; Use coins to purchase tools, licenses and exclusive content</div>' +
                '</div>' +
            '</div>' +
            '<div class="bank-xp-exchange-section">' +
                '<button class="bank-xp-exchange-toggle" id="bankXpExchangeToggle">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                    '<span>How to exchange Discord Server XP to Lab Coins (LC) on the Discord server</span>' +
                    '<svg class="bank-xp-toggle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</button>' +
                '<div class="bank-xp-exchange-content" id="bankXpExchangeContent">' +
                    '<div class="bank-xp-step bank-xp-step-tip"><span class="bank-xp-step-num" style="background:rgba(99,0,138,0.35);border-color:rgba(99,0,138,0.6);">i</span><div><strong>Website or Discord server</strong><br>To exchange XP here on the website your Discord account must be linked with your Rickware - Labs account. Alternatively you can also exchange your XP directly on our Discord server, as explained below.</div></div>' +
                    '<div class="bank-xp-step"><span class="bank-xp-step-num">1</span><div><strong>New users — DM Captcha Verification</strong><br>If you are new to our Discord server, you first need to complete the DM captcha verification. After joining, you will automatically receive a DM with a captcha challenge. Complete it to unlock full server access and the ability to use the bank system.</div></div>' +
                    '<div class="bank-xp-step"><span class="bank-xp-step-num">2</span><div><strong>Already verified members</strong><br>If you are already a verified member of our community Discord server, you can skip the verification step and use the bank channel directly.</div></div>' +
                    '<div class="bank-xp-step"><span class="bank-xp-step-num">3</span><div><strong>Use the <code>#ricks-bank</code> channel</strong><br>Navigate to the <code>#ricks-bank</code> text channel in our Discord server. In this channel you can:<br><br>• Check your XP balance and Lab Coin (LC) balance by entering your username or user ID.<br>• Trade your Discord Server XP for Lab Coins (LC) directly in the channel.<br><br>Simply follow all instructions posted in the <code>#ricks-bank</code> channel — all commands and exchange rates are listed there.</div></div>' +
                    '<div class="bank-xp-step bank-xp-step-tip"><span class="bank-xp-step-num" style="background:rgba(99,0,138,0.35);border-color:rgba(99,0,138,0.6);">!</span><div><strong>Tip</strong><br>The more active you are in our Discord community, the more XP you earn — and the more Lab Coins you can exchange. Stay active, participate, and grow your balance!</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="bank-section-title"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Buy Coin Packages</span></div>' +
            '<div class="bank-packs-grid">' + packHtml + '</div>' +
        '</div>';
    content.appendChild(section);
    var xpToggle = document.getElementById('bankXpExchangeToggle');
    var xpContent = document.getElementById('bankXpExchangeContent');
    if (xpToggle && xpContent) {
        xpToggle.addEventListener('click', function() {
            var isOpen = xpContent.classList.contains('open');
            xpContent.classList.toggle('open', !isOpen);
            xpToggle.classList.toggle('open', !isOpen);
        });
    }
    applyShinyTextToEls();
}

function openCoinCheckout(packId, coins, bonus, price, label) {
    var total = coins + bonus;
    var overlay = document.getElementById('checkoutModalOverlay');
    var inner = document.getElementById('checkoutModalInner');
    if (!overlay || !inner) return;
    var lcRate = currentLcUsdRate();
    var lcCost = Math.ceil(price / lcRate);
    var userLc = labCoinsBalance || 0;
    var canAffordLc = userLc >= lcCost;
    inner.innerHTML =
        '<div class="coin-checkout-modal">' +
            '<div class="coin-checkout-header">' +
                '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9a3 3 0 0 1 6 0c0 2-3 3-3 5"/></svg>' +
                '<h2>Buy Lab Coins</h2>' +
            '</div>' +
            '<div class="coin-checkout-summary glass-card">' +
                '<div class="coin-checkout-row"><span>Package</span><strong>' + label + ' Pack</strong></div>' +
                '<div class="coin-checkout-row"><span>Coins</span><strong>' + coins + ' LC</strong></div>' +
                (bonus > 0 ? '<div class="coin-checkout-row coin-bonus-row"><span>Bonus Coins</span><strong>+' + bonus + ' LC</strong></div>' : '') +
                '<div class="coin-checkout-row coin-total-row"><span>Total Coins</span><strong>' + total + ' LC</strong></div>' +
                '<div class="coin-checkout-divider"></div>' +
                '<div class="coin-checkout-row coin-price-row"><span>You Pay</span><strong>$' + price.toFixed(2) + ' USD</strong></div>' +
            '</div>' +
            '<div class="coin-checkout-payment">' +
                '<div class="coin-checkout-payment-label">Select Payment Method</div>' +
                '<div class="coin-payment-methods">' +
                    '<button class="coin-payment-btn active" data-method="btc"><span>₿</span> Bitcoin (BTC)</button>' +
                    '<button class="coin-payment-btn" data-method="eth"><span>Ξ</span> Ethereum (ETH)</button>' +
                    '<button class="coin-payment-btn" data-method="sol"><span>◎</span> Solana (SOL)</button>' +
                    '<button class="coin-payment-btn" data-method="bnb"><span>⬡</span> BNB (BNB)</button>' +
                    '<button class="coin-payment-btn" data-method="trx"><span>⚡</span> TRON (TRX)</button>' +
                    '<button class="coin-payment-btn" data-method="ltc"><span>Ł</span> Litecoin (LTC)</button>' +
                    '<button class="coin-payment-btn" data-method="bch"><span>₿</span> Bitcoin Cash (BCH)</button>' +
                    '<button class="coin-payment-btn" data-method="doge"><span>Ð</span> Dogecoin (DOGE)</button>' +
                    '<button class="coin-payment-btn" data-method="amazon"><span>📦</span> Amazon Voucher</button>' +
                    '<button class="coin-payment-btn" data-method="psc"><span>🎮</span> Paysafecard</button>' +
                    '<button class="coin-payment-btn lc-disabled" data-method="" disabled style="opacity:0.4;cursor:not-allowed;" title="Cannot buy Lab Coins with Lab Coins"><span>🪙</span> Lab Coins (LC) <span style="font-size:10px;">(N/A)</span></button>' +
                '</div>' +
            '</div>' +
            '<div class="coin-checkout-note">Crypto payments are processed automatically. Manual methods (Amazon, Paysafecard) require a Discord ticket.</div>' +
            '<button class="coin-checkout-confirm-btn" id="coinCheckoutConfirmBtn" onclick="coinCheckoutConfirmNew(\'' + packId + '\',' + coins + ',' + bonus + ',' + price + ',\'' + label + '\')">Proceed →</button>' +
        '</div>';
    overlay.classList.add('open');
    overlay.classList.remove('active');
    overlay.style.display = 'flex';
    inner.querySelectorAll('.coin-payment-btn:not([disabled])').forEach(function(btn) {
        btn.addEventListener('click', function() {
            inner.querySelectorAll('.coin-payment-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });
}

async function coinCheckoutConfirmNew(packId, coins, bonus, price, label) {
    var inner = document.getElementById('checkoutModalInner');
    if (!inner) return;
    var selectedBtn = inner.querySelector('.coin-payment-btn.active');
    if (!selectedBtn) { showBanner('Please select a payment method.', 'error'); return; }
    var total = coins + bonus;
    await runCheckout({
        overlayId: 'checkoutModalOverlay',
        inner: inner,
        items: [{ name: label + ' Pack (' + total + ' LC)', qty: 1, product: { id: packId, lc_pack: true }, licenseKey: null }],
        selectedBtn: selectedBtn,
        couponCode: null,
        onComplete: function() {}
    });
}

function coinCheckoutConfirm() {
    window.open((config && config.discord_invite) ? config.discord_invite : 'https://discord.gg/Wk7d8mJgyN', '_blank');
    var overlay = document.getElementById('checkoutModalOverlay');
    if (overlay) { overlay.style.display = 'none'; }
    document.body.style.overflow = '';
}

function hideBankPage() {
    var section = document.getElementById('bankPageSection');
    if (section) section.remove();
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content').forEach(function(t) { t.style.display = ''; });
}

function hideReviewsPage() {
    var section = document.getElementById('reviewsPageSection');
    if (section) section.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#reviewsPageSection):not(#supportPageSection):not(#forumPageSection)').forEach(function(t) { t.style.display = ''; });
}

function hideSupportPage() {
    var section = document.getElementById('supportPageSection');
    if (section) section.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#reviewsPageSection):not(#supportPageSection):not(#forumPageSection)').forEach(function(t) { t.style.display = ''; });
}

function showSupportPage() {
    var bankSection = document.getElementById('bankPageSection');
    if (bankSection) bankSection.style.display = 'none';
    var reviewsSection = document.getElementById('reviewsPageSection');
    if (reviewsSection) reviewsSection.style.display = 'none';
    var forumSection = document.getElementById('forumPageSection');
    if (forumSection) forumSection.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#supportPageSection)').forEach(function(t) { t.style.display = 'none'; });
    var section = document.getElementById('supportPageSection');
    if (!section) return;
    section.style.display = 'block';
    if (section.dataset.rendered === '1') return;
    section.dataset.rendered = '1';
    var discordInvite = (config && config.discord_invite) ? config.discord_invite : 'https://discord.gg/Wk7d8mJgyN';
    section.innerHTML =
        '<div class="bank-page">' +
            '<div style="display:flex;align-items:flex-start;gap:24px;margin-bottom:0;">' +
                '<img src="https://cdn.discordapp.com/attachments/1474602413225672744/1477142646509142128/r_l_logo_1.webp?ex=69a3afca&is=69a25e4a&hm=17cef7c592270a9a56c0363338d89eaabf488d6577158bd6aefdd070deae107e&" alt="Logo" style="width:120px;height:120px;border-radius:16px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'">' +
                '<div class="bank-page-header glass-card" style="flex:1;">' +
                    '<div class="bank-header-left">' +
                        '<h1><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Support Center</span></h1>' +
                        '<p>Get help from our team and AI assistant — available 24/7 on our Discord server.</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bank-coin-value-banner glass-card" style="align-items:flex-start;gap:20px;">' +
                '<div style="flex-shrink:0;margin-top:4px;"><svg width="36" height="36" viewBox="0 0 71 55" fill="#63008a"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg></div>' +
                '<div>' +
                    '<div class="bank-coin-value-title"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">How to Get Support</span></div>' +
                    '<div class="bank-coin-value-desc">All support is handled through our Discord community server. Join the server, then open a ticket to reach the team directly. Our owner and moderators personally respond to every request.</div>' +
                '</div>' +
            '</div>' +
            '<div class="support-boxes-wave" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;">' +
                '<div class="glass-card" style="padding:24px;display:flex;flex-direction:column;gap:12px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:44px;height:44px;border-radius:50%;background:rgba(99,0,138,0.25);border:1px solid rgba(150,0,200,0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                            '<svg width="20" height="20" viewBox="0 0 71 55" fill="#c97eff"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg>' +
                        '</div>' +
                        '<div style="font-size:15px;font-weight:700;color:#d4a0ff;">Step 1 — Join the Discord</div>' +
                    '</div>' +
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">Click the <strong style="color:#c97eff">Join Discord</strong> button in the sidebar to join our community server. You need to be a member before you can open a support ticket.</p>' +
                    '<a href="'+discordInvite+'" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#63008a;border-radius:9px;padding:10px 18px;color:#fff;font-size:13px;font-weight:600;text-decoration:none;transition:background 0.2s;width:fit-content;" onmouseover="this.style.background=\'#5865f2\'" onmouseout="this.style.background=\'#63008a\'"><svg width="16" height="16" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg> Join Discord Server</a>' +
                '</div>' +
                '<div class="glass-card" style="padding:24px;display:flex;flex-direction:column;gap:12px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:44px;height:44px;border-radius:50%;background:rgba(99,0,138,0.25);border:1px solid rgba(150,0,200,0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                        '</div>' +
                        '<div style="font-size:15px;font-weight:700;color:#d4a0ff;">Step 2 — Open a Ticket</div>' +
                    '</div>' +
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">Once you are in the server, navigate to the <strong style="color:#c97eff">#create-ticket</strong> channel and follow the instructions to open a support ticket. Describe your issue clearly and a team member will respond as soon as possible.</p>' +
                    '<div style="background:rgba(99,0,138,0.12);border:1px solid rgba(139,0,160,0.3);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--text-secondary);line-height:1.6;">' +
                        '<strong style="color:#c97eff;">Tip:</strong> Include your username, the product name, and a clear description of the issue to get help faster.' +
                    '</div>' +
                '</div>' +
                '<div class="glass-card" style="padding:24px;display:flex;flex-direction:column;gap:12px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:44px;height:44px;border-radius:50%;background:rgba(99,0,138,0.25);border:1px solid rgba(150,0,200,0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                        '</div>' +
                        '<div style="font-size:15px;font-weight:700;color:#d4a0ff;">AI Auto Support — 24/7</div>' +
                    '</div>' +
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">Inside every support ticket you will find our <strong style="color:#c97eff">AI Auto Support</strong> assistant that is available around the clock. It can answer questions, walk you through setup steps, troubleshoot issues, and explain any feature in detail. Just ask — it will guide you through everything.</p>' +
                    '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#22c55e;font-weight:600;">' +
                        '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;animation:statusPulse 2s ease-in-out infinite;"></div>' +
                        'Online 24/7 — Always Ready' +
                    '</div>' +
                '</div>' +
                '<div class="glass-card" style="padding:24px;display:flex;flex-direction:column;gap:12px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:44px;height:44px;border-radius:50%;background:rgba(99,0,138,0.25);border:1px solid rgba(150,0,200,0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                        '</div>' +
                        '<div style="font-size:15px;font-weight:700;color:#d4a0ff;">Owner Support</div>' +
                    '</div>' +
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">For issues that require human review, our owner personally handles support tickets. Complex technical problems, license questions, billing, and special requests are all handled directly by the owner with full context and care.</p>' +
                    '<div style="background:rgba(99,0,138,0.12);border:1px solid rgba(139,0,160,0.3);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--text-secondary);line-height:1.6;">' +
                        '<strong style="color:#c97eff;">Response Time:</strong> Typically within a few hours during active hours. The AI assistant handles your request instantly at any time.' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    applyShinyTextToEls();
}

function hideCustomerPanel() {
    var section = document.getElementById('customerPanelSection');
    if (section) section.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#reviewsPageSection):not(#supportPageSection):not(#customerPanelSection):not(#forumPageSection)').forEach(function(t) { t.style.display = ''; });
}

function showCustomerPanel() {
    var bankSection = document.getElementById('bankPageSection');
    if (bankSection) bankSection.style.display = 'none';
    var reviewsSection = document.getElementById('reviewsPageSection');
    if (reviewsSection) reviewsSection.style.display = 'none';
    var supportSection = document.getElementById('supportPageSection');
    if (supportSection) supportSection.style.display = 'none';
    var forumSection2 = document.getElementById('forumPageSection');
    if (forumSection2) forumSection2.style.display = 'none';
    var content = document.getElementById('content');
    if (!content) return;
    var existing = document.getElementById('customerPanelSection');
    if (existing) {
        content.querySelectorAll('.tab-content:not(#customerPanelSection)').forEach(function(t) { t.style.display = 'none'; });
        existing.style.display = '';
        renderCustomerPanelContent();
        return;
    }
    content.querySelectorAll('.tab-content').forEach(function(t) { t.style.display = 'none'; });
    var section = document.createElement('section');
    section.id = 'customerPanelSection';
    section.className = 'tab-content active';
    section.innerHTML = '<div class="customer-panel-page"><div class="cp-loading">Loading...</div></div>';
    content.appendChild(section);
    renderCustomerPanelContent();
}

function purchasePaymentMethod(purchase) {
    return (purchase && purchase.payment_method) || 'money';
}

function purchaseAmountLabel(purchase) {
    var method = purchasePaymentMethod(purchase);
    if (method === 'gift') return 'Gift';
    if (method === 'lab_coins') return (parseInt(purchase.lc_spent, 10) || 0) + ' LC';
    return '$' + (Number(purchase.amount) || 0).toFixed(2);
}

function purchaseStatusLabel(purchase) {
    var method = purchasePaymentMethod(purchase);
    if (method === 'gift') return 'Gifted By An Admin';
    if (method === 'lab_coins' && String(purchase.status || '').toLowerCase() === 'paid') return 'Paid With Lab Coins';
    return purchase.status || 'unknown';
}

function renderCustomerPanelContent() {
    var section = document.getElementById('customerPanelSection');
    if (!section) return;
    var fullUser = null;
    try { fullUser = JSON.parse(sessionStorage.getItem('rickware_user')); } catch(e) {}
    if (!fullUser) fullUser = currentUser;
    if (!fullUser) {
        section.innerHTML = '<div class="customer-panel-page"><div class="cp-loading">Not logged in.</div></div>';
        return;
    }
    var accountTypeBadgeStyle = getAccountTypeBadgeStyle(fullUser.account_type);
    var purchases = fullUser.purchased_products || [];
    var totalSpent = purchases.reduce(function(sum, p) { return sum + (purchasePaymentMethod(p) === 'money' ? (p.amount || 0) : 0); }, 0);
    var totalLabCoins = purchases.reduce(function(sum, p) { return sum + (purchasePaymentMethod(p) === 'lab_coins' ? (parseInt(p.lc_spent, 10) || 0) : 0); }, 0);
    var activeCount = purchases.filter(function(p) { var s = (p.status || '').toLowerCase(); return s === 'active' || s === 'paid' || s === 'completed'; }).length;
    var licenseKeys = fullUser.license_keys || [];
    var statsHtml =
        '<div class="cp-stats-grid">' +
            '<div class="cp-stat-card glass-card"><div class="cp-stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div><div class="cp-stat-info"><div class="cp-stat-value">' + purchases.length + '</div><div class="cp-stat-label">Total Purchases</div></div></div>' +
            '<div class="cp-stat-card glass-card"><div class="cp-stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="cp-stat-info"><div class="cp-stat-value">' + activeCount + '</div><div class="cp-stat-label">Active Licenses</div></div></div>' +
            '<div class="cp-stat-card glass-card"><div class="cp-stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="cp-stat-info"><div class="cp-stat-value">$' + totalSpent.toFixed(2) + (totalLabCoins ? ' <small>+ ' + totalLabCoins + ' LC</small>' : '') + '</div><div class="cp-stat-label">Total Spent</div></div></div>' +
            '<div class="cp-stat-card glass-card"><div class="cp-stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></div><div class="cp-stat-info"><div class="cp-stat-value">' + licenseKeys.length + '</div><div class="cp-stat-label">License Keys</div></div></div>' +
        '</div>';
    var ordersHtml = '';
    if (purchases.length === 0) {
        ordersHtml = '<div class="cp-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(155,0,204,0.4)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg><p>No active licenses yet.</p></div>';
    } else {
        var rowsHtml = purchases.map(function(p) {
            var sl = (p.status || 'unknown').toLowerCase();
            var statusClass = 'cp-status-unknown';
            if (sl === 'active' || sl === 'paid' || sl === 'completed' || sl === 'gifted') statusClass = 'cp-status-paid';
            else if (sl === 'pending') statusClass = 'cp-status-pending';
            else if (sl === 'cancelled' || sl === 'canceled' || sl === 'failed' || sl === 'aborted') statusClass = 'cp-status-cancelled';
            var couponHtml = p.coupon
                ? '<span class="cp-coupon-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>' + escHtml(p.coupon) + (p.saved ? ' <span class="cp-saved-inline">-$' + Number(p.saved).toFixed(2) + '</span>' : '') + '</span>'
                : '<span class="cp-no-coupon">—</span>';
            return '<div class="cp-order-row">' +
                '<span class="cp-order-date">' + escHtml(p.date || '—') + '</span>' +
                '<span class="cp-order-product">' + escHtml(p.product || '—') + '</span>' +
                '<span class="cp-order-amount">' + escHtml(purchaseAmountLabel(p)) + '</span>' +
                '<span class="' + statusClass + '">' + escHtml(purchaseStatusLabel(p)) + '</span>' +
                '<span>' + couponHtml + '</span>' +
            '</div>';
        }).join('');
        ordersHtml =
            '<div class="cp-orders-table">' +
                '<div class="cp-orders-header"><span>Date</span><span>Product</span><span>Amount</span><span>Status</span><span>Coupon</span></div>' +
                rowsHtml +
            '</div>';
    }
    var permsBadgeHtml = '';
    var permsVal = fullUser.account_permissions;
    if (permsVal && permsVal !== '' && permsVal !== 'none' && permsVal !== null) {
        var permsText = Array.isArray(permsVal) ? permsVal.join(', ') : permsVal;
        permsBadgeHtml = '<span style="background:rgba(99,0,138,0.22);color:#c97eff;border:1px solid rgba(155,0,204,0.45);display:inline-flex;flex-direction:column;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin-left:6px;"><span style=\'font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;line-height:1;margin-bottom:1px;\'>Acc Perm</span><span>' + escHtml(permsText) + '</span></span>';
    }
    var profileHtml =
        '<div class="cp-profile-card glass-card">' +
            '<div class="cp-profile-left">' +
                '<img src="' + escHtml(customerPanelAvatarSrc(fullUser)) + '" alt="" class="cp-profile-img" onerror="this.style.display=\'none\'">' +
                '<div class="cp-profile-info">' +
                    '<div class="cp-profile-username-row">' +
                        '<div class="cp-profile-username" style="' + escHtml(userNameStyle(fullUser.equipped_cosmetics || {})) + '">' + escHtml(fullUser.username || 'Unknown') + '</div>' +
                        '<span class="cp-account-type-badge" style="' + accountTypeBadgeStyle + 'flex-direction:column;align-items:center;padding:3px 10px;"><span style=\'font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;line-height:1;margin-bottom:1px;\'>Acc Type</span><span>' + escHtml(fullUser.account_type || 'User') + '</span></span>' +
                        permsBadgeHtml +
                    '</div>' +
                    '<div class="cp-profile-meta">' +
                        (fullUser.email_adress ? '<span class="cp-email-row"><span class="cp-email-value" id="cpEmailValue" translate="no">' + escHtml(maskedEmail(fullUser.email_adress)) + '</span><button type="button" class="cp-email-toggle" id="cpEmailToggle" title="Show or hide your email address" aria-pressed="false">' + EMAIL_EYE_ICON + '<span>Unhide</span></button></span>' : '') +
                        (fullUser.created_at ? '<span>Member since ' + escHtml(new Date(fullUser.created_at).toLocaleDateString()) + '</span>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="cp-profile-right">' +
                '<a href="./sites/account_settings.html" class="cp-quick-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Account Settings</a>' +
                '<a href="./sites/order_history.html" class="cp-quick-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Full Order History</a>' +
            '</div>' +
        '</div>';
    section.innerHTML =
        '<div class="customer-panel-page">' +
            '<div class="cp-page-header glass-card">' +
                '<div class="cp-header-left">' +
                    '<h1><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:10px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Customer Panel</span></h1>' +
                    '<p>Your purchases, licenses and account overview</p>' +
                '</div>' +
            '</div>' +
            profileHtml +
            statsHtml +
            '<div class="cp-section-title"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Your Products</span></div>' +
            ownedProductsHtml(fullUser.owned_products || []) +
            '<div class="cp-section-title"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Active Licenses</span></div>' +
            ordersHtml +
        '</div>';
    setupEmailToggle(section, fullUser.email_adress);
    setupOwnedProductActions(section, fullUser.owned_products || []);
    applyShinyTextToEls();
}

function ownedProductsHtml(products) {
    if (!products.length) {
        return '<div class="cp-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(155,0,204,0.4)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg><p>You do not own any deliverable products yet.</p></div>';
    }
    var rows = products.map(function(p) {
        var actionHtml;
        if (p.delivery === 'download') {
            actionHtml = '<button class="cp-product-btn cp-product-download" data-download-product="' + escHtml(p.product_id) + '" title="Download the source code of this product"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span></button>';
        } else if (p.delivery === 'launch') {
            actionHtml = '<button class="cp-product-btn cp-product-launch" data-launch-product="' + escHtml(p.product_id) + '" title="Start this tool through the Rickware - Labs© Launcher"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Launch</span></button>';
        } else {
            actionHtml = '<span class="cp-product-pending">Delivery pending</span>';
        }
        return '<div class="cp-product-row" translate="no">' +
            '<div class="cp-product-meta">' +
                '<span class="cp-product-name">' + escHtml(p.title) + '</span>' +
                '<span class="cp-product-cat">' + escHtml(p.category || '') + (p.version ? ' · ' + escHtml(p.version) : '') + '</span>' +
            '</div>' +
            '<div class="cp-product-action">' + actionHtml + '</div>' +
        '</div>';
    }).join('');
    return '<div class="cp-products-list">' + rows + '</div>';
}

function setupOwnedProductActions(section, ownedProducts) {
    section.querySelectorAll('[data-download-product]').forEach(function(btn) {
        btn.addEventListener('click', function() { downloadSourceProduct(btn.getAttribute('data-download-product'), btn); });
    });
    section.querySelectorAll('[data-launch-product]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var pid = btn.getAttribute('data-launch-product');
            var owned = (ownedProducts || []).filter(function(p) { return String(p.product_id) === String(pid); })[0];
            var catalogProduct = (products || []).filter(function(p) { return String(p.product_id) === String(pid); })[0];
            launchOwnedProduct(catalogProduct || owned || { product_id: pid }, btn);
        });
    });
}

var webDownloads = [];

function notifyWebDownloads(openPopup) {
    try { window.dispatchEvent(new CustomEvent('rwl-web-downloads', { detail: { open: !!openPopup } })); } catch (e) {}
}

window.RWLWebDownloads = {
    list: function() { return webDownloads.slice(); },
    active: function() { return webDownloads.filter(function(entry) { return entry.status === 'downloading'; }).length; }
};

function startWebDownload(productId, fileName, total) {
    var entry = { id: String(Date.now()) + productId, product_id: productId, name: fileName, total: total, received: 0, speed: 0, kind: 'download', status: 'downloading', web: true };
    webDownloads.unshift(entry);
    webDownloads = webDownloads.slice(0, 8);
    notifyWebDownloads(true);
    return entry;
}

function finishWebDownload(entry, status) {
    entry.status = status;
    entry.speed = 0;
    if (status === 'completed' && !entry.total) entry.total = entry.received;
    notifyWebDownloads(false);
    setTimeout(function() {
        webDownloads = webDownloads.filter(function(item) { return item !== entry; });
        notifyWebDownloads(false);
    }, 60000);
}

async function readDownloadBlob(response, entry) {
    if (!response.body || !response.body.getReader) {
        var whole = await response.blob();
        entry.received = whole.size;
        return whole;
    }
    var reader = response.body.getReader();
    var chunks = [];
    var windowStart = Date.now();
    var windowBytes = 0;
    while (true) {
        var part = await reader.read();
        if (part.done) break;
        chunks.push(part.value);
        entry.received += part.value.length;
        windowBytes += part.value.length;
        var elapsed = Date.now() - windowStart;
        if (elapsed >= 400) {
            entry.speed = windowBytes / (elapsed / 1000);
            windowStart = Date.now();
            windowBytes = 0;
            notifyWebDownloads(false);
        }
    }
    return new Blob(chunks);
}

async function downloadSourceProduct(productId, button) {
    var token = sessionStorage.getItem('rickware_token');
    if (!token) { showBanner('Please log in to download this product.', 'error'); return; }
    if (button) button.disabled = true;
    var downloadEntry = null;
    try {
        var response = await fetch(apiUrl('/api/product/source'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ product_id: productId, hwid: 'website' })
        });
        if (!response.ok) {
            var detail = 'The download is not available.';
            try { detail = (await response.json()).detail || detail; } catch (e) {}
            showBanner(detail, 'error');
            return;
        }
        var fileName = response.headers.get('X-File-Name') || 'rickware-labs-product.zip';
        downloadEntry = startWebDownload(productId, fileName, parseInt(response.headers.get('Content-Length'), 10) || 0);
        var blob = await readDownloadBlob(response, downloadEntry);
        finishWebDownload(downloadEntry, 'completed');
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.addEventListener('click', function(event) { event.stopPropagation(); });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
        showBanner('Download finished.', 'success');
    } catch (e) {
        if (downloadEntry) finishWebDownload(downloadEntry, 'failed');
        showBanner('The download failed. Please try again.', 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

var EMAIL_EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
var EMAIL_EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function maskedEmail(email) {
    var value = String(email || '');
    var at = value.indexOf('@');
    if (at < 1) return '••••••••••';
    return '••••••••@' + '•'.repeat(Math.min(Math.max(value.length - at - 1, 6), 12));
}

function setupEmailToggle(container, email) {
    var toggle = container ? container.querySelector('#cpEmailToggle') : null;
    var valueEl = container ? container.querySelector('#cpEmailValue') : null;
    if (!toggle || !valueEl || !email) return;
    var visible = false;
    toggle.addEventListener('click', function() {
        visible = !visible;
        valueEl.textContent = visible ? email : maskedEmail(email);
        toggle.innerHTML = (visible ? EMAIL_EYE_OFF_ICON : EMAIL_EYE_ICON) + '<span>' + (visible ? 'Hide' : 'Unhide') + '</span>';
        toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
    });
}

var reviewVotes = {};
var forumPosts = [];
var forumCommentOpen = {};
var userWrittenReviews = [];
var reviewsApiData = [];
var forumOnlineCount = 0;

async function loadReviewsData() {
    try {
        var res = await fetch(apiUrl('/api/reviews'));
        if (res.ok) {
            var data = await res.json();
            var myUser = currentUser ? currentUser.username : null;
            reviewsApiData = (data.reviews || []).map(function(r) {
                var likedBy = r.liked_by || [];
                var dislikedBy = r.disliked_by || [];
                return Object.assign({}, r, {
                    liked_by: likedBy,
                    disliked_by: dislikedBy,
                    _likedByMe: myUser ? likedBy.indexOf(myUser) >= 0 : false,
                    _dislikedByMe: myUser ? dislikedBy.indexOf(myUser) >= 0 : false
                });
            });
            reviewVotes = {};
            reviewsApiData.forEach(function(r, idx) {
                if (r._likedByMe) reviewVotes['rv-' + idx] = 'like';
                else if (r._dislikedByMe) reviewVotes['rv-' + idx] = 'dislike';
            });
        }
    } catch(e) {}
}

var COSMETIC_PAYLOAD_FIELDS = ['nameplate', 'nameplate_url', 'nameplate_speed', 'nameplate_filter', 'avatar_decoration_filter', 'avatar_decoration', 'avatar_decoration_url', 'avatar_decoration_thumb_url', 'avatar_decoration_speed', 'name_color', 'name_color_hex', 'name_color_rarity', 'name_color_animated', 'name_color_gradient', 'name_color_animation_seconds', 'name_color_effect', 'name_color_speed', 'name_color_direction', 'nameplate_outline', 'nameplate_outline_data', 'content_border', 'content_border_data'];

function cosmeticFields(source) {
    var fields = {};
    COSMETIC_PAYLOAD_FIELDS.forEach(function(key) {
        if (source && source[key] !== undefined) fields[key] = source[key];
    });
    return fields;
}

async function loadForumData() {
    try {
        var res = await fetch(apiUrl('/api/forum'));
        if (res.ok) {
            var data = await res.json();
            if (typeof data.online_count === 'number') forumOnlineCount = data.online_count;
            var myUser = currentUser ? currentUser.username : null;
            var normalizeComment = function(c) {
                return Object.assign({
                    comment_id: c.comment_id || '',
                    username: c.username || 'User',
                    account_type: c.account_type || null,
                    account_permissions: c.account_permissions || null,
                    profile_picture: c.profile_picture || null,
                    text: c.content || c.text || '',
                    time: c.date || c.time || '',
                    likes: c.likes || 0,
                    dislikes: c.dislikes || 0,
                    liked_by: c.liked_by || [],
                    disliked_by: c.disliked_by || [],
                    _likedByMe: myUser ? (c.liked_by || []).indexOf(myUser) >= 0 : false,
                    _dislikedByMe: myUser ? (c.disliked_by || []).indexOf(myUser) >= 0 : false,
                    replies: (c.replies || []).map(normalizeComment)
                }, cosmeticFields(c));
            };
            forumPosts = (data.posts || []).map(function(p) {
                return Object.assign({
                    post_id: p.post_id || '',
                    username: p.username || 'User',
                    account_type: p.account_type || null,
                    account_permissions: p.account_permissions || null,
                    profile_picture: p.profile_picture || null,
                    title: p.title || '',
                    body: p.content || p.body || '',
                    time: p.date || p.time || '',
                    likes: p.likes || 0,
                    dislikes: p.dislikes || 0,
                    liked_by: p.liked_by || [],
                    disliked_by: p.disliked_by || [],
                    is_pinned: !!p.is_pinned,
                    is_locked: !!p.is_locked,
                    _likedByMe: myUser ? (p.liked_by || []).indexOf(myUser) >= 0 : false,
                    _dislikedByMe: myUser ? (p.disliked_by || []).indexOf(myUser) >= 0 : false,
                    comments: (p.comments || []).map(normalizeComment)
                }, cosmeticFields(p));
            });
        }
    } catch(e) {}
}


async function showForumPage() {
    var bankSection = document.getElementById('bankPageSection');
    if (bankSection) bankSection.style.display = 'none';
    var reviewsSection = document.getElementById('reviewsPageSection');
    if (reviewsSection) reviewsSection.style.display = 'none';
    var supportSection = document.getElementById('supportPageSection');
    if (supportSection) supportSection.style.display = 'none';
    var customerSection = document.getElementById('customerPanelSection');
    if (customerSection) customerSection.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#forumPageSection)').forEach(function(t) { t.style.display = 'none'; });
    var section = document.getElementById('forumPageSection');
    if (!section) return;
    section.style.display = 'block';
    await loadForumData();
    renderForumPage(section);
}

function hideForumPage() {
    var section = document.getElementById('forumPageSection');
    if (section) section.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#forumPageSection):not(#reviewsPageSection):not(#supportPageSection)').forEach(function(t) { t.style.display = ''; });
}

function forumUserAvatar(username, profilePicture, userLike) {
    var initials = (username || 'U').split(/[_\s]/).map(function(w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || (username || 'U')[0].toUpperCase();
    var src = profilePicture ? profilePicUrl(profilePicture) : '';
    var avatarInner = src
        ? '<img src="' + escHtml(src) + '" class="forum-post-avatar-img" alt="' + escHtml(username) + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
          '<div class="forum-post-avatar" style="display:none;">' + escHtml(initials) + '</div>'
        : '<div class="forum-post-avatar">' + escHtml(initials) + '</div>';
    var decorationSrc = userDecorationSrc(userLike || { username: username });
    var decorationImg = decorationSrc ? '<img src="' + escHtml(decorationSrc) + '" alt="" class="forum-post-avatar-decoration"' + decorationFilterAttr(userLike) + '>' : '';
    return avatarInner + decorationImg;
}

function userNameColor(userLike) {
    return RWL.sanitizeHex(userLike && userLike.name_color_hex, (config && config.default_name_color) || '#ffffff');
}

function userNameStyle(userLike) {
    return RWL.nameColorStyle(userLike || {}, (config && config.default_name_color) || '#ffffff');
}

function userNameplateSrc(userLike) {
    if (userLike && userLike.nameplate_url) return userLike.nameplate_url;
    return siteBaseUrl() + 'images/assets/nameplates/' + ((config && config.default_nameplate) || 'spirit_blossom_petrals.webm');
}

function userDecorationSrc(userLike) {
    if (userLike && userLike.avatar_decoration_thumb_url) return userLike.avatar_decoration_thumb_url;
    if (userLike && userLike.avatar_decoration_url) return userLike.avatar_decoration_url;
    var decorationFile = (config && config.default_avatar_decoration) || 'chromawave.png';
    return siteBaseUrl() + 'images/assets/avatar_decoration/' + decorationFile;
}

function miniNameplateAvatarHtml(userLike, profilePicture) {
    var decorationSrc = userDecorationSrc(userLike);
    var decorationImg = decorationSrc
        ? '<img src="' + escHtml(decorationSrc) + '" alt="" class="mini-avatar-decoration"' + decorationFilterAttr(userLike) + '>'
        : '';
    return '<div class="mini-avatar-wrap">' +
                forumUserAvatar((userLike && userLike.username) || '', profilePicture) +
                decorationImg +
           '</div>';
}

function miniNameplateUsernameHtml(userLike, extraClass) {
    var username = (userLike && userLike.username) || 'User';
    return '<span class="' + (extraClass || '') + '" style="' + escHtml(userNameStyle(userLike)) + '">' + escHtml(username) + '</span>';
}

function miniNameplateWrapStart() {
    return '<div class="mini-nameplate-wrap">';
}

function miniNameplateBgHtml(userLike) {
    return nameplateVideoHtml(userLike);
}

function decorationFilterAttr(userLike) {
    var style = RWL.mediaFilterStyle(userLike && userLike.avatar_decoration_filter);
    return style ? ' style="' + escHtml(style) + '"' : '';
}

function nameplateVideoHtml(userLike) {
    var speed = userLike && userLike.nameplate_speed ? parseFloat(userLike.nameplate_speed) : 1;
    var plateStyle = RWL.mediaFilterStyle(userLike && userLike.nameplate_filter);
    return '<video class="mini-nameplate-bg"' + (plateStyle ? ' style="' + escHtml(plateStyle) + '"' : '') + ' autoplay loop muted playsinline data-rwl-speed="' + (isNaN(speed) ? 1 : speed) + '" src="' + escHtml(userNameplateSrc(userLike)) + '"></video>';
}

function outlineClasses(userLike) {
    return RWL.frameClasses(userLike && userLike.nameplate_outline_data);
}

function outlineStyleAttr(userLike) {
    var style = RWL.frameStyle(userLike && userLike.nameplate_outline_data);
    return style ? ' style="' + escHtml(style) + '"' : '';
}

function contentFrameClasses(userLike) {
    return RWL.frameClasses(userLike && userLike.content_border_data);
}

function contentFrameStyleAttr(userLike) {
    var style = RWL.frameStyle(userLike && userLike.content_border_data);
    return style ? ' style="' + escHtml(style) + '"' : '';
}

function forumBadgesHtml(accountType, accountPermissions) {
    var html = '';
    var type = accountType || 'User';
    var perms = Array.isArray(accountPermissions) ? accountPermissions.join(', ') : (accountPermissions || '');
    var isDefaultType = (type === 'User');
    var isDefaultPerms = (!perms || perms === '' || perms === 'none' || perms === 'User');
    html += '<span class="forum-user-type-badge" style="' + getAccountTypeBadgeStyle(type) + '">' + escHtml(type) + '</span>';
    if (!isDefaultPerms && !(isDefaultType && isDefaultPerms)) {
        html += '<span class="forum-user-perms-badge">' + escHtml(perms) + '</span>';
    }
    return html;
}

function renderForumPage(section) {
    var totalPosts = forumPosts.length;
    var onlineCount = forumOnlineCount;
    var totalComments = forumPosts.reduce(function(s, p) {
        function countAll(comments) {
            if (!comments) return 0;
            return comments.reduce(function(n, c) { return n + 1 + countAll(c.replies); }, 0);
        }
        return s + countAll(p.comments);
    }, 0);
    var canPost = !!currentUser;

    var statsHtml = '<div class="forum-stats-bar">' +
        '<div class="forum-stat-card"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div><div class="forum-stat-num">' + totalPosts + '</div><div class="forum-stat-label">Total Posts</div></div></div>' +
        '<div class="forum-stat-card"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><div><div class="forum-stat-num"><span style="color:#22c55e;">' + onlineCount + '</span></div><div class="forum-stat-label">Users Online</div></div></div>' +
        '<div class="forum-stat-card"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><div><div class="forum-stat-num">' + totalComments + '</div><div class="forum-stat-label">Comments</div></div></div>' +
        '<div class="forum-stat-card"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg><div><div class="forum-stat-num">' + forumPosts.reduce(function(s, p) { return s + (p.likes || 0); }, 0) + '</div><div class="forum-stat-label">Total Likes</div></div></div>' +
    '</div>';

    var newPostBtn = canPost
        ? '<button class="forum-new-post-btn" onclick="openForumPostModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Post</button>'
        : '<div class="forum-login-note">Login to create posts and comments</div>';

    var postsHtml = totalPosts === 0
        ? '<div class="forum-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(155,0,204,0.3)" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No posts yet. Be the first to share something!</p></div>'
        : '<div class="forum-posts-list" id="forumPostsList">' + forumPosts.map(function(p, idx) { return buildForumPostCard(p, idx); }).join('') + '</div>';

    section.innerHTML =
        '<div class="forum-page">' +
            '<div class="news-page-header">' +
                '<h1><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Community Forum</span></h1>' +
                '<p>Discuss, share and connect with the Rickware community.</p>' +
            '</div>' +
            statsHtml +
            '<div class="forum-toolbar">' + newPostBtn + '</div>' +
            postsHtml +
        '</div>';
    applyShinyTextToEls();
    attachForumEventListeners();
    setTimeout(reapplyForumVoteCooldowns, 0);
    section.querySelectorAll('.mini-nameplate-bg').forEach(function(v) {
        v.load();
        v.play().catch(function(){});
    });
}

function attachForumEventListeners() {
    document.querySelectorAll('.forum-comment-input, .forum-reply-input').forEach(function(input) {
        if (input.dataset.enterBound) return;
        input.dataset.enterBound = '1';
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                var submitBtn = input.nextElementSibling;
                if (submitBtn) submitBtn.click();
            }
        });
    });
}

function buildCommentHtml(c, postIdx, commentPath) {
    var avatarHtml = '<div class="forum-post-avatar-wrap">' + forumUserAvatar(c.username, c.profile_picture, c) + '</div>';
    var badges = forumBadgesHtml(c.account_type, c.account_permissions);
    var repliesHtml = '';
    if (c.replies && c.replies.length > 0) {
        repliesHtml = '<div class="forum-replies-list">' +
            c.replies.map(function(r, ri) {
                return buildCommentHtml(r, postIdx, commentPath + '-' + ri);
            }).join('') +
        '</div>';
    }
    var replyInputHtml = '';
    if (currentUser) {
        replyInputHtml = '<div class="forum-reply-input-row" id="forum-reply-row-' + postIdx + '-' + commentPath + '" style="display:none;">' +
            '<div class="forum-post-avatar-wrap">' + forumUserAvatar(currentUser.username, currentUser.profile_picture || (currentUser.profile_picture_base64 ? 'data:image/png;base64,' + currentUser.profile_picture_base64 : ''), currentUser) + '</div>' +
            '<div class="forum-reply-input-wrap">' +
                '<textarea class="forum-reply-input" id="forum-reply-input-' + postIdx + '-' + commentPath + '" placeholder="Write a reply..." rows="2" maxlength="500"></textarea>' +
                '<button class="forum-comment-post-btn forum-post-submit-btn" onclick="submitForumReply(' + postIdx + ',\'' + commentPath + '\')">Reply</button>' +
            '</div>' +
        '</div>';
    }
    return '<div class="forum-comment-item' + contentFrameClasses(c) + '" id="forum-comment-' + postIdx + '-' + commentPath + '"' + contentFrameStyleAttr(c) + '>' +
        '<div class="forum-comment-content">' +
            '<div class="forum-identity-box forum-comment-identity' + outlineClasses(c) + '"' + outlineStyleAttr(c) + '>' +
                nameplateVideoHtml(c) +
                avatarHtml +
                '<div class="forum-comment-meta">' +
                    '<span class="forum-comment-user" style=\"' + escHtml(userNameStyle(c)) + '\">' + escHtml(c.username) + '</span>' +
                    badges +
                    '<span class="forum-comment-time">' + escHtml(c.time) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="forum-comment-text" translate="no">' + escHtml(c.text) + '</div>' +
            '<div class="forum-comment-actions">' +
                '<button class="forum-vote-btn forum-comment-vote' + (c._likedByMe ? ' forum-voted-like' : '') + (!currentUser ? ' vote-disabled' : '') + '" data-vote-cooldown-key="comment-' + postIdx + '-' + commentPath + '-like" ' + (!currentUser ? 'disabled title="Login to vote"' : 'onclick="forumCommentVote(' + postIdx + ',\'' + commentPath + '\',\'like\')"') + '>' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>' +
                    '<span>' + (c.likes || 0) + '</span>' +
                '</button>' +
                '<button class="forum-vote-btn forum-comment-vote' + (c._dislikedByMe ? ' forum-voted-dislike' : '') + (!currentUser ? ' vote-disabled' : '') + '" data-vote-cooldown-key="comment-' + postIdx + '-' + commentPath + '-dislike" ' + (!currentUser ? 'disabled title="Login to vote"' : 'onclick="forumCommentVote(' + postIdx + ',\'' + commentPath + '\',\'dislike\')"') + '>' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>' +
                    '<span>' + (c.dislikes || 0) + '</span>' +
                '</button>' +
                (currentUser ? '<button class="forum-reply-toggle-btn" onclick="toggleForumReplyInput(' + postIdx + ',\'' + commentPath + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Reply</button>' : '') +
            '</div>' +
            replyInputHtml +
            repliesHtml +
        '</div>' +
    '</div>';
}

function buildForumPostCard(p, idx) {
    var avatarHtml = '<div class="forum-post-avatar-wrap">' + forumUserAvatar(p.username, p.profile_picture, p) + '</div>';
    var badges = forumBadgesHtml(p.account_type, p.account_permissions);
    var commentsHtml = '';
    if (forumCommentOpen[idx]) {
        var cList = (p.comments || []).map(function(c, ci) {
            return buildCommentHtml(c, idx, String(ci));
        }).join('');
        var commentInputHtml = '';
        if (currentUser) {
            var userPic = currentUser.profile_picture_base64 ? 'data:image/png;base64,' + currentUser.profile_picture_base64 : (currentUser.profile_picture || '');
            commentInputHtml = '<div class="forum-comment-input-row">' +
                '<div class="forum-post-avatar-wrap">' + forumUserAvatar(currentUser.username, userPic, currentUser) + '</div>' +
                '<div class="forum-comment-input-wrap">' +
                    '<textarea class="forum-comment-input" id="forumCommentInput-' + idx + '" placeholder="Write a comment... (Enter to send)" rows="2" maxlength="500"></textarea>' +
                    '<button class="forum-comment-post-btn forum-post-submit-btn" onclick="submitForumComment(' + idx + ')">Post</button>' +
                '</div>' +
            '</div>';
        } else {
            commentInputHtml = '<div class="forum-login-note-small">Login to comment</div>';
        }
        commentsHtml = '<div class="forum-comments-section" id="forumComments-' + idx + '">' +
            (cList || '<div class="forum-no-comments">No comments yet.</div>') +
            commentInputHtml +
        '</div>';
    }
    return '<div class="forum-post-card glass-card' + contentFrameClasses(p) + '" id="forumPost-' + idx + '"' + contentFrameStyleAttr(p) + '>' +
        '<div class="forum-post-header">' +
            '<div class="forum-identity-box' + outlineClasses(p) + '"' + outlineStyleAttr(p) + '>' +
                nameplateVideoHtml(p) +
                avatarHtml +
                '<div class="forum-post-meta">' +
                    '<div class="forum-post-user-row">' +
                        '<span class="forum-post-username" style=\"' + escHtml(userNameStyle(p)) + '\">' + escHtml(p.username) + '</span>' +
                        badges +
                    '</div>' +
                    '<span class="forum-post-time">' + escHtml(p.time) + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="forum-post-title" translate="no">' + escHtml(p.title) + '</div>' +
        '<div class="forum-post-body" translate="no">' + escHtml(p.body) + '</div>' +
        '<div class="forum-post-footer">' +
            '<button class="forum-vote-btn' + (p._likedByMe ? ' forum-voted-like' : '') + (!currentUser ? ' vote-disabled' : '') + '" data-vote-cooldown-key="post-' + idx + '-like" ' + (!currentUser ? 'disabled title="Login to vote"' : 'onclick="forumVote(' + idx + ',\'like\')"') + '>' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>' +
                '<span>' + (p.likes || 0) + '</span>' +
            '</button>' +
            '<button class="forum-vote-btn' + (p._dislikedByMe ? ' forum-voted-dislike' : '') + (!currentUser ? ' vote-disabled' : '') + '" data-vote-cooldown-key="post-' + idx + '-dislike" ' + (!currentUser ? 'disabled title="Login to vote"' : 'onclick="forumVote(' + idx + ',\'dislike\')"') + '>' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>' +
                '<span>' + (p.dislikes || 0) + '</span>' +
            '</button>' +
            '<button class="forum-comment-toggle-btn" onclick="toggleForumComments(' + idx + ')">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                '<span>' + (p.comments ? p.comments.length : 0) + ' Comments</span>' +
            '</button>' +
        '</div>' +
        commentsHtml +
    '</div>';
}

function getCommentByPath(comments, path) {
    var parts = path.split('-');
    var current = comments;
    var obj = null;
    for (var i = 0; i < parts.length; i++) {
        var idx = parseInt(parts[i]);
        if (i === parts.length - 1) {
            obj = current[idx];
        } else {
            obj = current[idx];
            current = obj.replies || [];
        }
    }
    return obj;
}

var forumVoteCooldowns = {};

function applyVoteCooldownToBtn(btn, key, seconds) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    var timerEl = document.createElement('span');
    timerEl.className = 'vote-cooldown-timer';
    timerEl.dataset.cooldownKey = key;
    timerEl.style.cssText = 'display:block;font-size:9px;color:rgba(255,255,255,0.45);text-align:center;margin-top:2px;pointer-events:none;';
    timerEl.textContent = seconds + 's';
    btn.parentNode && btn.parentNode.insertBefore(timerEl, btn);
    var remaining = seconds;
    var interval = setInterval(function() {
        remaining--;
        if (!document.body.contains(timerEl)) { clearInterval(interval); return; }
        timerEl.textContent = remaining + 's';
        if (remaining <= 0) {
            clearInterval(interval);
            delete forumVoteCooldowns[key];
            if (timerEl.parentNode) timerEl.remove();
            if (btn.parentNode) {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor = '';
            }
        }
    }, 1000);
    forumVoteCooldowns[key] = { interval: interval, until: Date.now() + seconds * 1000 };
}

function reapplyForumVoteCooldowns() {
    Object.keys(forumVoteCooldowns).forEach(function(key) {
        var cd = forumVoteCooldowns[key];
        var remaining = Math.ceil((cd.until - Date.now()) / 1000);
        if (remaining <= 0) { delete forumVoteCooldowns[key]; return; }
        clearInterval(cd.interval);
        var btn = document.querySelector('[data-vote-cooldown-key="' + key + '"]');
        if (!btn) return;
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        var timerEl = document.createElement('span');
        timerEl.className = 'vote-cooldown-timer';
        timerEl.dataset.cooldownKey = key;
        timerEl.style.cssText = 'display:block;font-size:9px;color:rgba(255,255,255,0.45);text-align:center;margin-top:2px;pointer-events:none;';
        timerEl.textContent = remaining + 's';
        btn.parentNode && btn.parentNode.insertBefore(timerEl, btn);
        var r = remaining;
        var interval = setInterval(function() {
            r--;
            if (!document.body.contains(timerEl)) { clearInterval(interval); return; }
            timerEl.textContent = r + 's';
            if (r <= 0) {
                clearInterval(interval);
                delete forumVoteCooldowns[key];
                if (timerEl.parentNode) timerEl.remove();
                if (btn.parentNode) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
            }
        }, 1000);
        forumVoteCooldowns[key].interval = interval;
    });
}

async function forumVote(idx, type) {
    var p = forumPosts[idx];
    if (!p) return;
    var likeKey = 'post-' + idx + '-like';
    var dislikeKey = 'post-' + idx + '-dislike';
    var crossKey = type === 'like' ? dislikeKey : likeKey;
    if (forumVoteCooldowns[crossKey]) return;
    var action = type;
    if (type === 'like') {
        if (p._likedByMe) { p._likedByMe = false; p.likes = (p.likes || 1) - 1; action = 'unlike'; }
        else { if (p._dislikedByMe) { p._dislikedByMe = false; p.dislikes = (p.dislikes || 1) - 1; } p._likedByMe = true; p.likes = (p.likes || 0) + 1; action = 'like'; }
    } else {
        if (p._dislikedByMe) { p._dislikedByMe = false; p.dislikes = (p.dislikes || 1) - 1; action = 'undislike'; }
        else { if (p._likedByMe) { p._likedByMe = false; p.likes = (p.likes || 1) - 1; } p._dislikedByMe = true; p.dislikes = (p.dislikes || 0) + 1; action = 'dislike'; }
    }
    var setCooldownOn = type === 'like' ? dislikeKey : likeKey;
    forumVoteCooldowns[setCooldownOn] = { until: Date.now() + 10000 };
    var section = document.getElementById('forumPageSection');
    if (section) renderForumPage(section);
    setTimeout(function() {
        var btn = document.querySelector('[data-vote-cooldown-key="' + setCooldownOn + '"]');
        if (btn) applyVoteCooldownToBtn(btn, setCooldownOn, Math.ceil((forumVoteCooldowns[setCooldownOn] && forumVoteCooldowns[setCooldownOn].until ? (forumVoteCooldowns[setCooldownOn].until - Date.now()) / 1000 : 10)));
    }, 0);
    if (currentUser && p.post_id) {
        var token = sessionStorage.getItem('rickware_token');
        var accountData = getAccountData();
        if (token && accountData) {
            try {
                await fetch(apiUrl('/api/forum/like'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ post_id: p.post_id, action: action })
                });
            } catch(e) {}
        }
    }
}

async function forumCommentVote(postIdx, commentPath, type) {
    var p = forumPosts[postIdx];
    if (!p || !p.comments) return;
    var c = getCommentByPath(p.comments, commentPath);
    if (!c) return;
    var likeKey = 'comment-' + postIdx + '-' + commentPath + '-like';
    var dislikeKey = 'comment-' + postIdx + '-' + commentPath + '-dislike';
    var crossKey = type === 'like' ? dislikeKey : likeKey;
    if (forumVoteCooldowns[crossKey]) return;
    var action = type;
    if (type === 'like') {
        if (c._likedByMe) { c._likedByMe = false; c.likes = (c.likes || 1) - 1; action = 'unlike'; }
        else { if (c._dislikedByMe) { c._dislikedByMe = false; c.dislikes = (c.dislikes || 1) - 1; } c._likedByMe = true; c.likes = (c.likes || 0) + 1; action = 'like'; }
    } else {
        if (c._dislikedByMe) { c._dislikedByMe = false; c.dislikes = (c.dislikes || 1) - 1; action = 'undislike'; }
        else { if (c._likedByMe) { c._likedByMe = false; c.likes = (c.likes || 1) - 1; } c._dislikedByMe = true; c.dislikes = (c.dislikes || 0) + 1; action = 'dislike'; }
    }
    var setCooldownOn = type === 'like' ? dislikeKey : likeKey;
    forumVoteCooldowns[setCooldownOn] = { until: Date.now() + 10000 };
    var section = document.getElementById('forumPageSection');
    if (section) renderForumPage(section);
    setTimeout(function() {
        var btn = document.querySelector('[data-vote-cooldown-key="' + setCooldownOn + '"]');
        if (btn) applyVoteCooldownToBtn(btn, setCooldownOn, Math.ceil((forumVoteCooldowns[setCooldownOn] && forumVoteCooldowns[setCooldownOn].until ? (forumVoteCooldowns[setCooldownOn].until - Date.now()) / 1000 : 10)));
    }, 0);
    if (currentUser && p.post_id) {
        var token = sessionStorage.getItem('rickware_token');
        var accountData = getAccountData();
        if (token && accountData) {
            try {
                await fetch(apiUrl('/api/forum/comment/like'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ post_id: p.post_id, comment_path: commentPath, action: action })
                });
            } catch(e) {}
        }
    }
}

function toggleForumComments(idx) {
    forumCommentOpen[idx] = !forumCommentOpen[idx];
    var section = document.getElementById('forumPageSection');
    if (section) renderForumPage(section);
}

function toggleForumReplyInput(postIdx, commentPath) {
    var rowId = 'forum-reply-row-' + postIdx + '-' + commentPath;
    var row = document.getElementById(rowId);
    if (!row) return;
    var isVisible = row.style.display !== 'none';
    row.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        var inp = document.getElementById('forum-reply-input-' + postIdx + '-' + commentPath);
        if (inp) {
            inp.focus();
            inp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitForumReply(postIdx, commentPath);
                }
            });
        }
    }
}

function applyForumButtonCooldown(btn, seconds) {
    if (!btn) return;
    btn.disabled = true;
    var originalText = btn.textContent;
    var remaining = seconds;
    var timerEl = document.createElement('span');
    timerEl.style.cssText = 'display:block;font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;';
    timerEl.textContent = remaining + 's';
    btn.appendChild(timerEl);
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    var interval = setInterval(function() {
        remaining--;
        if (timerEl.parentNode) timerEl.textContent = remaining + 's';
        if (remaining <= 0) {
            clearInterval(interval);
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
            if (timerEl.parentNode) timerEl.remove();
        }
    }, 1000);
}

async function submitForumComment(idx) {
    var input = document.getElementById('forumCommentInput-' + idx);
    if (!input || !input.value.trim()) return;
    if (!currentUser) return;
    var postBtn = input && input.parentNode ? input.parentNode.querySelector('.forum-comment-post-btn') : null;
    if (postBtn && postBtn.disabled) return;
    var token = sessionStorage.getItem('rickware_token');
    var accountData = getAccountData();
    var now = new Date();
    var timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \xb7 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var p = forumPosts[idx];
    if (!p.comments) p.comments = [];
    var userPic = currentUser.profile_picture_base64 ? 'data:image/png;base64,' + currentUser.profile_picture_base64 : (currentUser.profile_picture || '');
    var commentText = input.value.trim();
    if (postBtn) applyForumButtonCooldown(postBtn, 10);
    p.comments.push({
        username: currentUser.username || 'User',
        account_type: currentUser.account_type || null,
        account_permissions: currentUser.account_permissions || null,
        profile_picture: userPic || null,
        text: commentText,
        time: timeStr,
        likes: 0,
        dislikes: 0,
        replies: []
    });
    var section = document.getElementById('forumPageSection');
    if (section) renderForumPage(section);
    if (token && accountData && p.post_id) {
        try {
            await fetch(apiUrl('/api/forum/comment'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ post_id: p.post_id, content: commentText })
            });
        } catch(e) {}
    }
}

async function submitForumReply(postIdx, commentPath) {
    var input = document.getElementById('forum-reply-input-' + postIdx + '-' + commentPath);
    if (!input || !input.value.trim()) return;
    if (!currentUser) return;
    var replyBtn = input && input.parentNode ? input.parentNode.querySelector('.forum-comment-post-btn') : null;
    if (replyBtn && replyBtn.disabled) return;
    var p = forumPosts[postIdx];
    if (!p || !p.comments) return;
    var parentComment = getCommentByPath(p.comments, commentPath);
    if (!parentComment) return;
    var MAX_DEPTH = 10;
    var isAdmin = currentUser.account_permissions === 'Admin' || currentUser.account_type === 'Owner' || currentUser.account_type === 'Admin';
    var depth = commentPath.split('.').length;
    if (!isAdmin && depth >= MAX_DEPTH) { showBanner('Maximum reply depth reached.', 'error'); return; }
    var token = sessionStorage.getItem('rickware_token');
    var accountData = getAccountData();
    if (!token || !accountData) { showBanner('Session expired. Please login again.', 'error'); return; }
    var replyText = input.value.trim();
    if (replyBtn) applyForumButtonCooldown(replyBtn, 10);
    try {
        var res = await fetch(apiUrl('/api/forum/reply'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ post_id: p.post_id, comment_path: commentPath, content: replyText })
        });
        if (res.ok) {
            var data = await res.json();
            var now = new Date();
            var timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \xb7 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            var userPic = currentUser.profile_picture_base64 ? 'data:image/png;base64,' + currentUser.profile_picture_base64 : (currentUser.profile_picture || '');
            if (!parentComment.replies) parentComment.replies = [];
            parentComment.replies.push({
                comment_id: data.comment_id || '',
                username: currentUser.username || 'User',
                account_type: currentUser.account_type || null,
                account_permissions: currentUser.account_permissions || null,
                profile_picture: userPic || null,
                text: replyText,
                time: timeStr,
                likes: 0,
                dislikes: 0,
                replies: []
            });
            var section = document.getElementById('forumPageSection');
            if (section) renderForumPage(section);
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'Failed to post reply.', 'error');
        }
    } catch(e) {
        showBanner('Failed to post reply.', 'error');
    }
}

function openForumPostModal() {
    var overlay = document.getElementById('forumPostModalOverlay');
    var inner = document.getElementById('forumPostModalInner');
    if (!overlay || !inner) return;
    inner.innerHTML =
        '<div class="write-review-form">' +
            '<h2 class="write-review-title"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> New Forum Post</h2>' +
            '<div class="write-review-field">' +
                '<label>Post Title <span style="color:var(--text-tertiary);font-size:11px;">(5–30 chars)</span></label>' +
                '<input type="text" id="forumPostTitle" class="write-review-input" placeholder="Enter a title..." maxlength="30">' +
                '<div class="forum-field-footer"><span class="forum-field-error" id="forumTitleErr"></span><span class="forum-char-counter" id="forumTitleCount">0 / 30</span></div>' +
            '</div>' +
            '<div class="write-review-field">' +
                '<label>Content <span style="color:var(--text-tertiary);font-size:11px;">(40–1000 chars)</span></label>' +
                '<textarea id="forumPostBody" class="write-review-textarea" placeholder="Write your post... (Enter to submit)" maxlength="1000" rows="6"></textarea>' +
                '<div class="forum-field-footer"><span class="forum-field-error" id="forumBodyErr"></span><span class="forum-char-counter" id="forumBodyCount">0 / 1000</span></div>' +
            '</div>' +
            '<div class="write-review-actions">' +
                '<button class="forum-post-submit-btn" id="forumPostSubmitBtn" disabled onclick="submitForumPost()">Post</button>' +
            '</div>' +
        '</div>';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('forumPostModalClose').onclick = closeForumPostModal;
    overlay.onclick = function(e) { if (e.target === overlay) closeForumPostModal(); };
    var titleInput = document.getElementById('forumPostTitle');
    var bodyInput = document.getElementById('forumPostBody');
    var submitBtn = document.getElementById('forumPostSubmitBtn');
    function validatePost() {
        var t = (titleInput.value || '').length;
        var b = (bodyInput.value || '').length;
        document.getElementById('forumTitleCount').textContent = t + ' / 30';
        document.getElementById('forumBodyCount').textContent = b + ' / 1000';
        var titleErr = document.getElementById('forumTitleErr');
        var bodyErr = document.getElementById('forumBodyErr');
        var ok = true;
        if (t > 0 && (t < 5 || t > 30)) { titleErr.textContent = 'Title must be 5–30 characters'; ok = false; } else { titleErr.textContent = ''; }
        if (b > 0 && (b < 40 || b > 1000)) { bodyErr.textContent = 'Content must be 40–1000 characters'; ok = false; } else { bodyErr.textContent = ''; }
        submitBtn.disabled = !(t >= 5 && t <= 30 && b >= 40 && b <= 1000);
    }
    titleInput.addEventListener('input', validatePost);
    bodyInput.addEventListener('input', validatePost);
    bodyInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !submitBtn.disabled) {
            e.preventDefault();
            submitForumPost();
        }
    });
    titleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !submitBtn.disabled) {
            e.preventDefault();
            submitForumPost();
        }
    });
}

function closeForumPostModal() {
    var overlay = document.getElementById('forumPostModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function submitForumPost() {
    var submitBtn = document.getElementById('forumPostSubmitBtn');
    if (submitBtn) {
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
    var title = (document.getElementById('forumPostTitle') || {}).value || '';
    var body = (document.getElementById('forumPostBody') || {}).value || '';
    var category = (document.getElementById('forumPostCategory') || {}).value || 'General';
    if (title.trim().length < 5 || title.trim().length > 30) { showBanner('Title must be 5–30 characters.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    if (body.trim().length < 40 || body.trim().length > 1000) { showBanner('Content must be 40–1000 characters.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    if (!currentUser) { showBanner('Please login to post.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    var token = sessionStorage.getItem('rickware_token');
    if (!token) { showBanner('Please login to post.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    var accountData = getAccountData();
    if (!accountData) { showBanner('Session expired. Please login again.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    try {
        var res = await fetch(apiUrl('/api/forum/post'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ title: title.trim(), content: body.trim(), category: category })
        });
        if (res.ok) {
            var data = await res.json();
            var now = new Date();
            var timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \xb7 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            var userPic = currentUser.profile_picture_base64 ? 'data:image/png;base64,' + currentUser.profile_picture_base64 : (currentUser.profile_picture || '');
            forumPosts.unshift({
                post_id: data.post_id || '',
                username: currentUser.username || 'User',
                account_type: currentUser.account_type || null,
                account_permissions: currentUser.account_permissions || null,
                profile_picture: userPic || null,
                title: title.trim(),
                body: body.trim(),
                time: timeStr,
                likes: 0,
                dislikes: 0,
                comments: []
            });
            closeForumPostModal();
            var section = document.getElementById('forumPageSection');
            if (section) renderForumPage(section);
            showBanner('Post published!', 'success');
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'Failed to create post.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; }
        }
    } catch(e) {
        showBanner('Failed to create post.', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; }
    }
}

function openWriteReviewModal() {
    if (!currentUser) { showBanner('Please login to write a review.', 'error'); return; }
    var overlay = document.getElementById('writeReviewModalOverlay');
    var inner = document.getElementById('writeReviewModalInner');
    if (!overlay || !inner) return;
    var apiCats = {};
    if (productsData && productsData.categorys && productsData.categorys[0]) {
        var c = productsData.categorys[0];
        Object.keys(c).forEach(function(k) { if (c[k] !== 'Coming Soon') apiCats[c[k]] = true; });
    }
    var productTypes = Object.keys(apiCats).length > 0 ? Object.keys(apiCats) : ['Macro Tool', 'FiveM Script', 'Discord Bot', 'License Manager', 'Other'];
    inner.innerHTML =
        '<div class="write-review-form">' +
            '<h2 class="write-review-title"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Write a Review</h2>' +
            '<div class="write-review-field"><label>Select Product Category</label><div class="write-review-types" id="reviewTypesList">' +
                productTypes.map(function(t) { return '<button class="review-type-btn" data-type="' + t + '" onclick="selectReviewType(this,\'' + t + '\')">' + t + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="write-review-field" id="reviewProductField" style="display:none;"><label>Select Product</label><div class="write-review-products" id="reviewProductsList"></div></div>' +
            '<div class="write-review-field" id="reviewStarsField" style="display:none;"><label>Rating</label><div class="star-picker" id="starPicker">' +
                [1,2,3,4,5].map(function(s) {
                    return '<svg class="star-pick-svg" data-star="' + s + '" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5" style="cursor:pointer;transition:transform 0.15s,fill 0.1s;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                }).join('') +
                '<span id="starPickerLabel" style="margin-left:12px;color:#c97eff;font-weight:700;font-size:15px;"></span>' +
            '</div></div>' +
            '<div class="write-review-field" id="reviewTextField" style="display:none;"><label>Your Review <span style="color:var(--text-tertiary);font-size:11px;">(max 500 characters)</span></label><textarea id="reviewTextInput" class="write-review-textarea" maxlength="500" placeholder="Share your experience..."></textarea><div class="write-review-char-count" id="reviewCharCount">0/500</div></div>' +
            '<div class="write-review-actions" id="reviewActions" style="display:none;">' +
                '<button class="btn-secondary" onclick="closeWriteReviewModal()">Cancel</button>' +
                '<button class="forum-post-submit-btn" onclick="submitUserReview()">Post Review</button>' +
            '</div>' +
        '</div>';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('writeReviewModalClose').onclick = closeWriteReviewModal;
    overlay.onclick = function(e) { if (e.target === overlay) closeWriteReviewModal(); };
    var textarea = document.getElementById('reviewTextInput');
    if (textarea) {
        textarea.addEventListener('input', function() {
            var cc = document.getElementById('reviewCharCount');
            if (cc) cc.textContent = textarea.value.length + '/500';
        });
    }
    setupStarPicker();
    window._reviewState = { type: null, product: null, stars: 0 };
}

function setupStarPicker() {
    var picker = document.getElementById('starPicker');
    if (!picker) return;
    var svgs = picker.querySelectorAll('.star-pick-svg');
    svgs.forEach(function(svg) {
        svg.addEventListener('click', function() {
            var val = parseInt(svg.getAttribute('data-star'), 10);
            window._reviewState = window._reviewState || {};
            window._reviewState.stars = val;
            updateStarPickerDisplay(val);
            var label = document.getElementById('starPickerLabel');
            if (label) label.textContent = val + ' / 5';
        });
        svg.addEventListener('mouseenter', function() {
            var val = parseInt(svg.getAttribute('data-star'), 10);
            updateStarPickerDisplay(val);
        });
        svg.addEventListener('mouseleave', function() {
            var cur = (window._reviewState && window._reviewState.stars) || 0;
            updateStarPickerDisplay(cur);
        });
    });
}

function updateStarPickerDisplay(val) {
    var picker = document.getElementById('starPicker');
    if (!picker) return;
    picker.querySelectorAll('.star-pick-svg').forEach(function(svg) {
        var s = parseInt(svg.getAttribute('data-star'), 10);
        if (s <= val) {
            svg.setAttribute('fill', '#c97eff');
            svg.style.transform = 'scale(1.2)';
            svg.style.filter = 'drop-shadow(0 0 4px rgba(201,126,255,0.6))';
        } else {
            svg.setAttribute('fill', 'none');
            svg.style.transform = 'scale(1)';
            svg.style.filter = 'none';
        }
    });
}

function selectReviewType(btn, type) {
    document.querySelectorAll('.review-type-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    window._reviewState = window._reviewState || {};
    window._reviewState.type = type;
    var productField = document.getElementById('reviewProductField');
    var productList = document.getElementById('reviewProductsList');
    if (!productField || !productList) return;
    var allProds = (productsData && productsData.products) ? productsData.products : products;
    var matchingProducts = allProds.filter(function(p) {
        if (p.file_product === false) return false;
        var cat = (p.category || '').toLowerCase();
        var t = type.toLowerCase();
        return cat.includes(t.split(' ')[0]) || (p.name || p.title || '').toLowerCase().includes(t.split(' ')[0]);
    });
    if (matchingProducts.length === 0) matchingProducts = allProds.filter(function(p) { return p.file_product !== false; }).slice(0, 10);
    productList.innerHTML = matchingProducts.map(function(p, i) {
        return '<button class="review-product-btn" data-id="' + escHtml(String(p.id || i)) + '" onclick="selectReviewProduct(this,\'' + escHtml((p.name || p.title || '').replace(/'/g,"\\'" )) + '\')">' + escHtml(p.name || p.title || 'Product ' + (i+1)) + '</button>';
    }).join('');
    productField.style.display = 'block';
    window._reviewState.product = null;
}

function selectReviewProduct(btn, name) {
    document.querySelectorAll('.review-product-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    window._reviewState = window._reviewState || {};
    window._reviewState.product = name;
    document.getElementById('reviewStarsField').style.display = 'block';
    document.getElementById('reviewTextField').style.display = 'block';
    document.getElementById('reviewActions').style.display = 'flex';
}

function closeWriteReviewModal() {
    var overlay = document.getElementById('writeReviewModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    window._reviewState = null;
}

async function submitUserReview() {
    var submitBtn = document.querySelector('#writeReviewModalInner .forum-post-submit-btn[onclick="submitUserReview()"], #writeReviewModalInner button[onclick="submitUserReview()"]');
    if (submitBtn) {
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
    var state = window._reviewState || {};
    var text = (document.getElementById('reviewTextInput') || {}).value || '';
    if (!state.product) { showBanner('Please select a product.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    if (!state.stars) { showBanner('Please select a star rating.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    if (!text.trim()) { showBanner('Please write your review.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    if (!currentUser) { showBanner('Please login to write a review.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    var token = sessionStorage.getItem('rickware_token');
    if (!token) { showBanner('Please login to write a review.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    var accountData = getAccountData();
    if (!accountData) { showBanner('Session expired. Please login again.', 'error'); if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; } return; }
    try {
        var res = await fetch(apiUrl('/api/reviews/create'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                product_type: state.type || state.product,
                product_description: state.product,
                text: text.trim(),
                stars: state.stars
            })
        });
        if (res.ok) {
            closeWriteReviewModal();
            await loadReviewsData();
            var container = document.getElementById('reviewsPageContainer');
            if (container) { container.dataset.rendered = '1'; await showReviewsPage(); }
            showBanner('Review posted!', 'success');
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'Failed to post review.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; }
        }
    } catch(e) {
        showBanner('Failed to post review.', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; }
    }
}

async function showReviewsPage() {
    var bankSection = document.getElementById('bankPageSection');
    if (bankSection) bankSection.style.display = 'none';
    var content = document.getElementById('content');
    if (content) content.querySelectorAll('.tab-content:not(#reviewsPageSection)').forEach(function(t) { t.style.display = 'none'; });
    var section = document.getElementById('reviewsPageSection');
    if (!section) return;
    section.style.display = 'block';
    var container = document.getElementById('reviewsPageContainer');
    if (!container) return;
    await loadReviewsData();
    container.dataset.rendered = '1';

    var reviews = getReviewsData();

    var starDist = [0,0,0,0,0];
    reviews.forEach(function(r) { if (r.stars >= 1 && r.stars <= 5) starDist[r.stars-1]++; });
    var totalReviews = reviews.length;
    var avgScore = totalReviews > 0 ? (reviews.reduce(function(s,r){return s+r.stars;},0)/totalReviews).toFixed(1) : '0.0';
    var uniqueUsers = [...new Set(reviews.map(function(r){return r.username;}))].length;
    var uniqueProducts = [...new Set(reviews.map(function(r){return r.product;}))].length;

    function starsSVG(count, size) {
        var s = size || 14;
        var html = '';
        for (var i=1;i<=5;i++) {
            var fill = i <= count ? '#c97eff' : 'rgba(150,0,220,0.2)';
            html += '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+fill+'"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        return html;
    }

    var barsHtml = '';
    for (var s=5;s>=1;s--) {
        var cnt = starDist[s-1];
        var pct = totalReviews > 0 ? Math.round(cnt/totalReviews*100) : 0;
        barsHtml += '<div class="reviews-bar-row">' +
            '<span style="min-width:10px;color:#c97eff;">' + s + '</span>' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="#c97eff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
            '<div class="reviews-bar-track"><div class="reviews-bar-fill" style="width:'+pct+'%"></div></div>' +
            '<span class="reviews-bar-count">'+cnt+'</span>' +
        '</div>';
    }

    var statsHtml = '<div class="reviews-stats-bar">' +
        '<div class="reviews-stats-score">' +
            (totalReviews > 0 ? '<div class="reviews-stats-big-num">' + avgScore + '</div>' : '<div class="reviews-stats-big-num" style="color:#8060a0;font-size:22px;">No reviews yet</div>') +
            '<div class="reviews-stats-stars-row">' + starsSVG(Math.round(parseFloat(avgScore)), 16) + '</div>' +
            '<div class="reviews-stats-total-label">' + totalReviews + ' reviews</div>' +
        '</div>' +
        '<div class="reviews-stats-divider"></div>' +
        '<div class="reviews-stats-meta">' +
            '<div class="reviews-stats-meta-item"><strong>' + totalReviews + '</strong> total reviews</div>' +
            '<div class="reviews-stats-meta-item"><strong>' + uniqueUsers + '</strong> unique users</div>' +
            '<div class="reviews-stats-meta-item"><strong>' + uniqueProducts + '</strong> products reviewed</div>' +
            '<div class="reviews-stats-meta-item">Average: <strong>' + (totalReviews > 0 ? avgScore : '0.0') + ' / 5</strong> stars</div>' +
        '</div>' +
        '<div class="reviews-stats-divider"></div>' +
        '<div class="reviews-stats-bars">' + barsHtml + '</div>' +
    '</div>';

    var gridHtml = '<div class="reviews-grid" id="reviewsGrid"></div>';
    var writeReviewBtn = currentUser
        ? '<button class="forum-new-post-btn" style="margin-bottom:16px;" onclick="openWriteReviewModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Write a Review</button>'
        : '';
    container.innerHTML = '<div class="news-page-header"><h1><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">Customer Reviews</span></h1><p>Verified reviews from our community users across all products.</p></div>' + writeReviewBtn + statsHtml + gridHtml;

    var grid = document.getElementById('reviewsGrid');
    reviews.forEach(function(r, idx) {
        var card = document.createElement('div');
        card.className = 'review-card';
        var initials = r.username.split('_').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2) || r.username[0].toUpperCase();
        var shortText = r.text.length > 100 ? r.text.slice(0,100) + '…' : r.text;
        var hasMore = r.text.length > 100;

        var avatarHtml = r.profile_picture
            ? '<img src="' + escHtml(profilePicUrl(r.profile_picture)) + '" class="review-avatar-img" alt="' + escHtml(r.username) + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
              '<div class="review-avatar" style="display:none;">' + escHtml(initials) + '</div>'
            : '<div class="review-avatar">' + escHtml(initials) + '</div>';
        var decorationSrcR = userDecorationSrc(r);
        var decorationHtmlR = decorationSrcR ? '<img src="' + escHtml(decorationSrcR) + '" alt="" class="review-avatar-decoration"' + decorationFilterAttr(r) + '>' : '';

        var rType = r.account_type || 'User';
        var rPerms = Array.isArray(r.account_permissions) ? r.account_permissions.join(', ') : (r.account_permissions || '');
        var typeBadgeHtml = '<span class="forum-user-type-badge" style="' + getAccountTypeBadgeStyle(rType) + '">' + escHtml(rType) + '</span>';
        var permsBadgeHtml = (rPerms && rPerms !== '' && rPerms !== 'none' && rPerms !== 'User')
            ? '<span class="forum-user-perms-badge">' + escHtml(rPerms) + '</span>'
            : '';

        card.innerHTML =
            '<div class="review-card-top">' +
                '<div class="review-stars">' + starsSVG(r.stars, 13) + '</div>' +
                '<div class="review-product-type" translate="no">' + escHtml(r.product) + '</div>' +
            '</div>' +
            '<div class="review-product-meta-header">' +
                (r.product_type ? '<span class="review-category-label">' + escHtml(r.product_type) + '</span>' : '') +
                '<span class="review-product-name-label" translate="no">' + escHtml(r.product || r.product_description || '') + '</span>' +
            '</div>' +
            '<div>' +
                '<div class="review-body-preview" translate="no" id="rv-preview-'+idx+'">' + escHtml(shortText) + '</div>' +
                '<div class="review-body-full" translate="no" id="rv-full-'+idx+'">' + escHtml(r.text) + '</div>' +
                (hasMore ? '<button class="review-read-more" id="rv-btn-'+idx+'" onclick="toggleReviewBody('+idx+')">Read more</button>' : '') +
            '</div>' +
            '<div class="review-user-row' + outlineClasses(r) + '"' + outlineStyleAttr(r) + '>' +
                nameplateVideoHtml(r) +
                '<div class="review-avatar-wrap">' + avatarHtml + decorationHtmlR + '</div>' +
                '<div class="review-user-info">' +
                    '<div class="review-user-name-row">' +
                        '<span class="review-username" style=\"' + escHtml(userNameStyle(r)) + '\">' + escHtml(r.username) + '</span>' +
                        typeBadgeHtml +
                        permsBadgeHtml +
                    '</div>' +
                    '<span class="review-datetime">' + escHtml(r.date) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="review-card-bottom">' +
                reviewSourceBadgeHtml(r) +
                '<div class="review-vote-row">' +
                    '<button class="review-vote-btn' + (!canVoteReview(r) ? ' vote-disabled' : '') + '" id="rv-like-'+idx+'" ' + (!canVoteReview(r) ? 'disabled title="' + reviewVoteBlockedTitle(r) + '"' : 'onclick="voteReview('+idx+',\'like\')"') + '><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> <span id="rv-like-count-'+idx+'">' + (r.likes||0) + '</span></button>' +
                    '<button class="review-vote-btn' + (!canVoteReview(r) ? ' vote-disabled' : '') + '" id="rv-dislike-'+idx+'" ' + (!canVoteReview(r) ? 'disabled title="' + reviewVoteBlockedTitle(r) + '"' : 'onclick="voteReview('+idx+',\'dislike\')"') + '><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg> <span id="rv-dislike-count-'+idx+'">' + (r.dislikes||0) + '</span></button>' +
                '</div>' +
            '</div>';
        var frameClassNames = contentFrameClasses(r);
        if (frameClassNames) {
            card.className += frameClassNames;
            card.style.cssText += RWL.frameStyle(r.content_border_data);
        }
        grid.appendChild(card);
        var npBgEl = card.querySelector('.mini-nameplate-bg');
        if (npBgEl) {
            npBgEl.load();
            npBgEl.play().catch(function(){});
        }
    });
    applyShinyTextToEls();
    applyAllReviewVoteStates();
    startReviewsLiveRefresh();
}

function toggleReviewBody(idx) {
    var preview = document.getElementById('rv-preview-'+idx);
    var full = document.getElementById('rv-full-'+idx);
    var btn = document.getElementById('rv-btn-'+idx);
    if (!preview || !full || !btn) return;
    var isOpen = full.classList.contains('open');
    if (isOpen) {
        full.classList.remove('open');
        preview.classList.remove('hidden-preview');
        btn.textContent = 'Read more';
    } else {
        full.classList.add('open');
        preview.classList.add('hidden-preview');
        btn.textContent = 'Read less';
    }
}

var reviewVoteCooldowns = {};

function applyReviewVoteCooldown(btn, key, seconds) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    var timerEl = document.createElement('span');
    timerEl.style.cssText = 'display:block;font-size:9px;color:rgba(255,255,255,0.45);text-align:center;margin-top:1px;pointer-events:none;';
    timerEl.textContent = seconds + 's';
    btn.appendChild(timerEl);
    var remaining = seconds;
    var interval = setInterval(function() {
        remaining--;
        if (!document.body.contains(timerEl)) { clearInterval(interval); return; }
        timerEl.textContent = remaining + 's';
        if (remaining <= 0) {
            clearInterval(interval);
            delete reviewVoteCooldowns[key];
            if (timerEl.parentNode) timerEl.remove();
            if (btn.parentNode) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
        }
    }, 1000);
    reviewVoteCooldowns[key] = { interval: interval, until: Date.now() + seconds * 1000 };
}

var reviewVoteInFlight = {};

function applyReviewVoteState(idx, likes, dislikes, myVote) {
    var key = 'rv-' + idx;
    var likeBtn = document.getElementById('rv-like-' + idx);
    var dislikeBtn = document.getElementById('rv-dislike-' + idx);
    var likeCount = document.getElementById('rv-like-count-' + idx);
    var dislikeCount = document.getElementById('rv-dislike-count-' + idx);
    reviewVotes[key] = myVote || null;
    if (likeBtn) likeBtn.classList.toggle('voted-like', myVote === 'like');
    if (dislikeBtn) dislikeBtn.classList.toggle('voted-dislike', myVote === 'dislike');
    if (likeCount) likeCount.textContent = Math.max(0, parseInt(likes, 10) || 0);
    if (dislikeCount) dislikeCount.textContent = Math.max(0, parseInt(dislikes, 10) || 0);
    var review = reviewsApiData[idx];
    if (review) {
        review.likes = Math.max(0, parseInt(likes, 10) || 0);
        review.dislikes = Math.max(0, parseInt(dislikes, 10) || 0);
        review._likedByMe = myVote === 'like';
        review._dislikedByMe = myVote === 'dislike';
    }
}

function applyAllReviewVoteStates() {
    reviewsApiData.forEach(function(review, idx) {
        applyReviewVoteState(idx, review.likes, review.dislikes, review._likedByMe ? 'like' : (review._dislikedByMe ? 'dislike' : null));
    });
}

async function voteReview(idx, type) {
    var review = reviewsApiData[idx];
    if (!canVoteReview(review) || !review.review_id) return;
    var key = 'rv-' + idx;
    if (reviewVoteInFlight[key]) return;
    var likeCount = document.getElementById('rv-like-count-' + idx);
    var dislikeCount = document.getElementById('rv-dislike-count-' + idx);
    if (!likeCount || !dislikeCount) return;
    var prev = reviewVotes[key] || null;
    var prevLikes = parseInt(likeCount.textContent, 10) || 0;
    var prevDislikes = parseInt(dislikeCount.textContent, 10) || 0;
    var next = prev === type ? null : type;
    var action = next === null ? (type === 'like' ? 'unlike' : 'undislike') : type;
    var likes = prevLikes - (prev === 'like' ? 1 : 0) + (next === 'like' ? 1 : 0);
    var dislikes = prevDislikes - (prev === 'dislike' ? 1 : 0) + (next === 'dislike' ? 1 : 0);
    applyReviewVoteState(idx, likes, dislikes, next);
    reviewVoteInFlight[key] = true;
    try {
        var data = await RWL.apiRequest('/api/reviews/like', { method: 'POST', body: { review_id: review.review_id, action: action } });
        if (data && typeof data.likes === 'number') applyReviewVoteState(idx, data.likes, data.dislikes, data.my_vote || null);
    } catch (error) {
        applyReviewVoteState(idx, prevLikes, prevDislikes, prev);
        showBanner(error && error.message ? error.message : 'Your vote could not be saved. Please try again.', 'error');
    } finally {
        setTimeout(function() { delete reviewVoteInFlight[key]; }, 600);
    }
}

function getReviewsData() {
    return reviewsApiData;
}

function setupLoginRegisterButtons() {
    var loginBtn = document.getElementById('loginBtn');
    var registerBtn = document.getElementById('registerBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = './sites/login_register.html?tab=login';
        });
    }
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            window.location.href = './sites/login_register.html?tab=register';
        });
    }
}

function setupProfileSidebar() {
    var profileBtn = document.getElementById('userProfileBtn');
    var sidebar = document.getElementById('profileSidebar');
    var overlay = document.getElementById('overlay');
    var logoutBtn = document.getElementById('logoutBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (sidebar) sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', function() {
            if (sidebar) sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            var token = RWL.getToken();
            var refreshToken = sessionStorage.getItem('rickware_refresh_token') || localStorage.getItem('rickware_refresh_token');
            if (window.RWLLauncher) await RWLLauncher.disconnect();
            if (token) {
                try {
                    await fetch(apiUrl('/api/logout'), {
                        method: 'POST',
                        headers: RWL.authHeaders(),
                        body: JSON.stringify({ refresh_token: refreshToken || null })
                    });
                } catch(e) {}
            }
            RWL.clearSession();
            sessionStorage.clear();
            currentUser = null;
            var ab = document.getElementById('authButtons');
            var up = document.getElementById('userProfileBtn');
            var atb = document.getElementById('accountTypeBadge');
            if (ab) ab.style.display = 'flex';
            if (up) up.style.display = 'none';
            if (atb) atb.style.display = 'none';
            window.location.reload();
        });
    }
    window.addEventListener('beforeunload', function() {
        var token = sessionStorage.getItem('rickware_token');
        if (token) {
            var url = apiUrl('/api/online/offline');
            try {
                navigator.sendBeacon(url + '?token=' + encodeURIComponent(token));
            } catch(e) {}
        }
    });
    var profileSupportBtn = document.getElementById('profileSupportBtn');
    if (profileSupportBtn) {
        profileSupportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            var navItems = document.querySelectorAll('.nav-item[data-page]');
            navItems.forEach(function(n) { n.classList.remove('active'); });
            hideBankPage();
            hideReviewsPage();
            hideForumPage();
            hideCustomerPanel();
            showSupportPage();
        });
    }
}

var discordCache = {};

async function fetchDiscordCount(inviteUrl) {
    if (!inviteUrl) return null;
    if (discordCache[inviteUrl] !== undefined) return discordCache[inviteUrl];
    try {
        var code = inviteUrl.split('/').pop().split('?')[0];
        var res = await fetch('https://discord.com/api/v10/invites/' + code + '?with_counts=true');
        if (!res.ok) return null;
        var data = await res.json();
        discordCache[inviteUrl] = data.approximate_member_count;
        return data.approximate_member_count;
    } catch(e) {
        return null;
    }
}

function fmtCount(n) {
    if (n === null || n === undefined) return '...';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

function platformIcon(name) {
    if (name === 'discord') return '<svg width="14" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg>';
    if (name === 'website') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    if (name === 'github') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';
    if (name === 'tiktok') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>';
    if (name === 'instagram') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>';
    return '';
}

function getProductImageUrl(url) {
    if (!url || !url.trim()) return url;
    var trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    var ext = trimmed.split('.').pop().toLowerCase();
    if (ext === 'gif') return trimmed;
    if (trimmed === '' || trimmed.endsWith('/')) return trimmed;
    return './images/products/' + trimmed;
}

var PRODUCT_CARD_IMAGE_VARIANTS = {
    'discord_tools/Rickware-Labs_X_Nexus_Discord_Server_Joiner_Main.webp': 'discord_tools/Rickware-Labs_X_Nexus_Discord_Server_Joiner_Main_card.webp',
    'discord_tools/Rickware-Labs_X_Nexus_Discord_Token_Gen_Main.webp': 'discord_tools/Rickware-Labs_X_Nexus_Discord_Token_Gen_Main_card.webp',
    'discord_bots/Rickware-Lab_Only_DM_Captcha_Verify_System_Main.webp': 'discord_bots/Rickware-Lab_Only_DM_Captcha_Verify_System_Main_card.webp'
};

function productCardImageUrl(url) {
    var trimmed = String(url || '').trim();
    return getProductImageUrl(PRODUCT_CARD_IMAGE_VARIANTS[trimmed] || url);
}

function buildPartnerCard(p) {
    var card = document.createElement('div');
    card.className = 'partner-card';
    trackFx('partner', { id: String(p.title || p.name || '').slice(0, 120) });

    var imgArea = document.createElement('div');
    imgArea.className = 'partner-image-area';

    if (p.preview_image_url && p.preview_image_url.trim()) {
        var img = document.createElement('img');
        img.className = 'partner-preview-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = getPartnerImageUrl(p.preview_image_url);
        img.alt = p.title;
        img.onerror = function() { img.remove(); };
        imgArea.appendChild(img);
    }

    if (p.banner && p.banner.trim()) {
        var bannerEl = document.createElement('div');
        bannerEl.className = 'partner-banner-label';
        bannerEl.textContent = p.banner;
        imgArea.appendChild(bannerEl);
    }

    if (p.owner_name && p.owner_name.trim()) {
        var ownerEl = document.createElement('div');
        ownerEl.className = 'partner-owner-label';
        ownerEl.textContent = 'Owner: ' + p.owner_name;
        imgArea.appendChild(ownerEl);
    }

    var primaryDiscord = (p.discord_url && p.discord_url.trim()) ? p.discord_url : ((p.discord_url_2 && p.discord_url_2.trim()) ? p.discord_url_2 : null);
    if (primaryDiscord) {
        var counter = document.createElement('div');
        counter.className = 'partner-discord-counter';
        counter.innerHTML = '<span class="partner-discord-dot"></span><span class="dc-count">...</span>';
        imgArea.appendChild(counter);
        fetchDiscordCount(primaryDiscord).then(function(n) {
            var span = counter.querySelector('.dc-count');
            if (span) span.textContent = fmtCount(n) + ' members';
        });
        setInterval(function() {
            delete discordCache[primaryDiscord];
            fetchDiscordCount(primaryDiscord).then(function(n) {
                var span = counter.querySelector('.dc-count');
                if (span) span.textContent = fmtCount(n) + ' members';
            });
        }, 30000);
    }

    card.appendChild(imgArea);

    var body = document.createElement('div');
    body.className = 'partner-body';

    var titleEl = document.createElement('div');
    titleEl.className = 'partner-title';
    titleEl.innerHTML = '<span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">' + escHtml(p.title) + '</span>';
    body.appendChild(titleEl);

    if (p.description && p.description.trim()) {
        var desc = document.createElement('div');
        desc.className = 'partner-description';
        desc.textContent = p.description;
        body.appendChild(desc);
    }

    var btns = document.createElement('div');
    btns.className = 'partner-buttons';

    function addBtn(url, cls, label, icon) {
        if (!url || !url.trim()) return;
        var a = document.createElement('a');
        a.className = 'partner-btn ' + cls;
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.innerHTML = platformIcon(icon) + ' ' + label;
        btns.appendChild(a);
    }

    addBtn(p.discord_url,   'partner-btn-discord',   'Discord',   'discord');
    addBtn(p.discord_url_2, 'partner-btn-discord',   'Discord 2', 'discord');
    addBtn(p.website_url,   'partner-btn-website',   'Website',   'website');
    addBtn(p.github_url,    'partner-btn-github',    'GitHub',    'github');
    addBtn(p.tiktok_url,    'partner-btn-tiktok',    'TikTok',    'tiktok');
    addBtn(p.instagram_url, 'partner-btn-instagram', 'Instagram', 'instagram');

    body.appendChild(btns);
    card.appendChild(body);
    return card;
}

async function loadPartners() {
    var grid = document.getElementById('partnerGrid');
    if (!grid) return;

    var data = null;
    var paths = ['./config/partner.json', './partner.json'];
    for (var i = 0; i < paths.length; i++) {
        try {
            var res = await fetch(paths[i]);
            if (res.ok) { data = await res.json(); break; }
        } catch(e) {}
    }

    grid.innerHTML = '';

    if (!data || !data.partners || data.partners.length === 0) {
        grid.innerHTML = '<p style="color:#808080;padding:30px;">No Trusted Partners Found.</p>';
        return;
    }

    var sorted = data.partners.slice().sort(function(a, b) { return a.id - b.id; });
    sorted.forEach(function(p) {
        grid.appendChild(buildPartnerCard(p));
    });
    applyShinyTextToEls();
}

function initAuthPage() {
    var authTabs = document.querySelectorAll('.auth-tab');
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var sliderTrack = document.getElementById('authSliderTrack');
    var tabIndicator = document.getElementById('authTabIndicator');
    var params = new URLSearchParams(window.location.search);

    var authLogoEl = document.querySelector('.auth-logo');
    if (authLogoEl) {
        authLogoEl.src = '../images/main/r_l_logo_1.webp';
        authLogoEl.onerror = function() { this.style.display = 'none'; };
    }

    function switchTab(tabName) {
        authTabs.forEach(function(t) { t.classList.remove('active'); });
        var targetTab = Array.from(authTabs).find(function(t) { return t.getAttribute('data-tab') === tabName; });
        if (targetTab) targetTab.classList.add('active');
        if (sliderTrack) sliderTrack.style.transform = tabName === 'register' ? 'translateX(-50%)' : 'translateX(0)';
        if (tabIndicator && authTabs.length >= 2) {
            tabIndicator.style.transform = tabName === 'register' ? 'translateX(100%)' : 'translateX(0)';
        }
    }

    if (params.get('tab') === 'register') {
        switchTab('register');
    }

    authTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            switchTab(tab.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.toggle-password').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var inp = document.getElementById(btn.getAttribute('data-target'));
            if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
        });
    });

    var loginFormEl = document.getElementById('loginForm');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var user = await loginUser(
                document.getElementById('login-username-email').value,
                document.getElementById('login-password').value
            );
            if (user) { sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: 'Successfully logged in. Welcome back, ' + (user.username || 'User') + '!', type: 'success' })); window.location.href = '../index.html'; }
        });
    }

    var forgotLink = document.getElementById('forgotPasswordLink');
    var forgotSection = document.getElementById('forgotPasswordSection');
    var forgotBackLink = document.getElementById('forgotBackLink');
    var forgotFormEl = document.getElementById('forgotPasswordForm');
    var resetFormEl = document.getElementById('resetCodeForm');

    if (forgotLink && forgotSection) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            forgotSection.style.display = 'block';
        });
    }
    if (forgotBackLink) {
        forgotBackLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (forgotSection) forgotSection.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }
    if (forgotFormEl) {
        forgotFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var identifier = document.getElementById('forgot-identifier').value.trim();
            var sent = await forgotPassword(identifier);
            if (sent) {
                forgotFormEl.style.display = 'none';
                if (resetFormEl) resetFormEl.style.display = 'block';
                var hiddenId = document.getElementById('reset-identifier');
                if (hiddenId) hiddenId.value = identifier;
            }
        });
    }
    if (resetFormEl) {
        resetFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var identifier = (document.getElementById('reset-identifier') || {}).value || '';
            var code = document.getElementById('reset-code').value.trim();
            var newPw = document.getElementById('reset-new-password').value;
            var newPw2 = document.getElementById('reset-confirm-password').value;
            if (newPw !== newPw2) { showBanner('Passwords do not match', 'error'); return; }
            if (newPw.length < 6) { showBanner('Password must be at least 6 characters', 'error'); return; }
            var ok = await confirmReset(identifier, code, newPw);
            if (ok) {
                if (forgotSection) forgotSection.style.display = 'none';
                if (loginForm) loginForm.style.display = 'block';
                if (forgotFormEl) forgotFormEl.style.display = 'block';
                if (resetFormEl) resetFormEl.style.display = 'none';
            }
        });
    }

    var registerFormEl = document.getElementById('registerForm');
    if (registerFormEl) {
        registerFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var pw = document.getElementById('register-password').value;
            var pw2 = document.getElementById('register-confirm-password').value;
            if (pw !== pw2) { showBanner('Passwords do not match!', 'error'); return; }
            if (pw.length < 6) { showBanner('Password must be at least 6 characters', 'error'); return; }
            var user = await registerUser(
                document.getElementById('register-username').value,
                document.getElementById('register-email').value,
                document.getElementById('register-phone').value,
                pw
            );
            if (user) { sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: 'Account created! Welcome, ' + (user.username || 'User') + '!', type: 'success' })); window.location.href = '../index.html'; }
        });
    }
}

function setupSearch() {
    var input = document.getElementById('searchInput');
    var suggestions = document.getElementById('searchSuggestions');
    if (!input || !suggestions) return;

    function matchesQuery(p, q) {
        if (!q) return true;
        var lower = q.toLowerCase();
        if (p.title && p.title.toLowerCase().indexOf(lower) >= 0) return true;
        if (p.description && p.description.toLowerCase().indexOf(lower) >= 0) return true;
        if (p.full_description && p.full_description.toLowerCase().indexOf(lower) >= 0) return true;
        if (p.category && p.category.toLowerCase().indexOf(lower) >= 0) return true;
        return false;
    }

    var searchTrackTimer = null;
    input.addEventListener('input', function() {
        var val = input.value.trim();
        if (searchTrackTimer) clearTimeout(searchTrackTimer);
        if (val.length >= 2) searchTrackTimer = setTimeout(function() { trackFx('search', { value: val }); }, 900);
        if (!val || !productsData || !productsData.products) {
            suggestions.style.display = 'none';
            return;
        }
        var q = val.toLowerCase();
        var matches = productsData.products.filter(function(p) {
            return matchesQuery(p, q);
        }).slice(0, 8);
        if (matches.length === 0) {
            suggestions.style.display = 'none';
            return;
        }
        suggestions.innerHTML = matches.map(function(p) {
            return '<div class="search-suggestion-item" data-title="' + escHtml(p.title) + '">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                escHtml(p.title) + '</div>';
        }).join('');
        suggestions.style.display = 'block';
        suggestions.querySelectorAll('.search-suggestion-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var title = item.getAttribute('data-title');
                input.value = title;
                suggestions.style.display = 'none';
                searchActiveQuery = title;
                renderProducts(currentCategory);
            });
        });
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var val = input.value.trim();
            suggestions.style.display = 'none';
            searchActiveQuery = val;
            renderProducts(currentCategory);
        }
        if (e.key === 'Escape') {
            suggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

var partnersListScrollAnim = null;

function loadPartnersList() {
    var paths = ['./config/partner.json', './partner.json'];
    var tabStrip = document.getElementById('partnerTabListStrip');
    var tabTrack = document.getElementById('partnerTabListTrack');

    var fetchNext = function(idx) {
        if (idx >= paths.length) return;
        fetch(paths[idx]).then(function(res) {
            if (!res.ok) { fetchNext(idx + 1); return; }
            return res.json();
        }).then(function(data) {
            if (!data) return;
            var list = data.partners_list;
            if (!list || list.length === 0) return;
            var sorted = list.slice().sort(function(a, b) { return a.id - b.id; });

            if (tabTrack && tabStrip) {
                tabTrack.innerHTML = '';
                sorted.forEach(function(p) {
                    var a = document.createElement('a');
                    a.className = 'partner-list-item';
                    a.href = p.discord_url || '#';
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    if (p.preview_image_url && p.preview_image_url.trim()) {
                        var img = document.createElement('img');
                        img.className = 'partner-list-avatar';
                        img.loading = 'lazy';
                        img.decoding = 'async';
                        img.src = getPartnerImageUrl(p.preview_image_url);
                        img.alt = p.owner_name || '';
                        img.onerror = function() {
                            img.style.display = 'none';
                            var ph = buildAvatarPlaceholder(p.owner_name);
                            a.insertBefore(ph, img.nextSibling);
                        };
                        a.appendChild(img);
                    } else {
                        a.appendChild(buildAvatarPlaceholder(p.owner_name));
                    }
                    if (p.owner_name) {
                        var name = document.createElement('span');
                        name.className = 'partner-list-name';
                        name.textContent = p.owner_name.trim();
                        a.appendChild(name);
                    }
                    tabTrack.appendChild(a);
                });
                tabStrip.style.display = 'block';
            }
        }).catch(function() { fetchNext(idx + 1); });
    };
    fetchNext(0);
}

function buildAvatarPlaceholder(name) {
    var ph = document.createElement('div');
    ph.className = 'partner-list-avatar-placeholder';
    ph.textContent = name ? name.trim().charAt(0).toUpperCase() : '?';
    return ph;
}

var partnersListScrollAnim = null;
var partnerTabScrollAnim = null;

function getPartnerImageUrl(url) {
    if (!url || !url.trim()) return url;
    var trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed === '' || trimmed.endsWith('/')) return trimmed;
    return './images/partner/' + trimmed;
}

async function loadNews() {
    var grid = document.getElementById('newsGrid');
    if (!grid) return;
    var data = null;
    var paths = ['./config/news.json', './news.json'];
    for (var i = 0; i < paths.length; i++) {
        try {
            var res = await fetch(paths[i]);
            if (res.ok) { data = await res.json(); break; }
        } catch(e) {}
    }
    if (!data || !data.q_and_a_content || data.q_and_a_content.length === 0) {
        grid.innerHTML = '<div class="empty-state">No news available.</div>';
        return;
    }
    var items = data.q_and_a_content.slice().sort(function(a, b) { return a.id - b.id; });
    var html = '';
    items.forEach(function(item, idx) {
        var badge = item.badge || '';
        var badgeColor = item.badge_color || '#63008a';
        var type = item.type || '';
        var title = item.title || '';
        var description = item.description || '';
        var author = item.author || '';
        var published = item['published:'] || item.published || '';
        var isNew = badge.toLowerCase() === 'new info';
        if (isNew) {
            html += '<div class="news-card news-card-featured" style="grid-column:1/-1;">';
        } else {
            html += '<div class="news-card">';
        }
        html += '<div class="news-card-badge" style="background:' + escHtml(badgeColor) + ';">' + escHtml(badge) + '</div>';
        html += '<div class="news-card-meta">';
        if (published) html += '<span class="news-date">' + escHtml(published) + '</span>';
        if (type) html += '<span class="news-category">' + escHtml(type) + '</span>';
        html += '</div>';
        html += '<h2 class="news-card-title" translate="no"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">' + escHtml(title) + '</span></h2>';
        html += '<p class="news-card-body" translate="no">' + escHtml(description) + '</p>';
        if (author) html += '<div class="news-card-footer"><span class="news-author">by ' + escHtml(author) + '</span></div>';
        html += '</div>';
    });
    grid.innerHTML = html;
    applyShinyTextToEls();
}

async function loadQA() {
    var list = document.getElementById('qaList');
    if (!list) return;
    var data = null;
    var paths = ['./config/q_&_a.json', './config/q_a.json', './config/qa.json', './q_a.json'];
    for (var i = 0; i < paths.length; i++) {
        try {
            var res = await fetch(paths[i]);
            if (res.ok) { data = await res.json(); break; }
        } catch(e) {}
    }
    if (!data || !data.q_and_a_content || data.q_and_a_content.length === 0) {
        list.innerHTML = '<div class="empty-state">No Q&amp;A available.</div>';
        return;
    }
    var items = data.q_and_a_content.slice().sort(function(a, b) { return a.id - b.id; });
    var html = '';
    items.forEach(function(item) {
        html += '<div class="qa-item">';
        html += '<button class="qa-toggle"><span>' + escHtml(item.title || '') + '</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>';
        html += '<div class="qa-answer" translate="no">' + escHtml(item.description || '') + '</div>';
        html += '</div>';
    });
    list.innerHTML = html;
}

async function loadGithubTab() {
    var grid = document.getElementById('githubGrid');
    var listStrip = document.getElementById('githubListStrip');
    var listTrack = document.getElementById('githubListTrack');
    if (!grid) return;
    var data = null;
    var paths = ['./config/github.json', './github.json'];
    for (var i = 0; i < paths.length; i++) {
        try {
            var res = await fetch(paths[i]);
            if (res.ok) { data = await res.json(); break; }
        } catch(e) {}
    }
    if (!data) {
        grid.innerHTML = '<div class="empty-state">No repositories found.</div>';
        return;
    }
    var profiles = data.profiles || data.owners || data.contributors || data.partners_list || [];
    if (profiles.length > 0 && listTrack && listStrip) {
        var statsContainer = document.getElementById('githubStatsStrip');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'githubStatsStrip';
            statsContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;margin-bottom:18px;';
            listStrip.parentNode.insertBefore(statsContainer, listStrip);
        }
        listTrack.innerHTML = '';
        profiles.forEach(function(p) {
            var githubUsername = '';
            if (p.github_url && p.github_url.trim()) {
                var m = p.github_url.trim().match(/github\.com\/([^\/?#]+)/);
                if (m) githubUsername = m[1];
            }
            var a = document.createElement('a');
            a.className = 'partner-list-item github-profile-item';
            a.href = p.github_url || p.website_url || '#';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 14px;min-width:80px;text-decoration:none;';
            var avatarEl = document.createElement('img');
            avatarEl.className = 'partner-list-avatar';
            avatarEl.style.cssText = 'width:52px;height:52px;border-radius:50%;border:2px solid rgba(139,0,160,0.4);object-fit:cover;';
            avatarEl.alt = p.owner_name || githubUsername || '';
            if (githubUsername) {
                var cacheKey = 'gh_profile_' + githubUsername;
                var cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        var cachedData = JSON.parse(cached);
                        avatarEl.src = cachedData.avatar_url || '';
                        renderGithubProfileStats(statsContainer, cachedData, githubUsername, p);
                    } catch(e) { avatarEl.src = ''; }
                } else {
                    avatarEl.src = 'https://avatars.githubusercontent.com/' + githubUsername + '?size=100';
                    fetch('https://api.github.com/users/' + githubUsername)
                        .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
                        .then(function(udata) {
                            sessionStorage.setItem(cacheKey, JSON.stringify(udata));
                            avatarEl.src = udata.avatar_url || avatarEl.src;
                            renderGithubProfileStats(statsContainer, udata, githubUsername, p);
                            if (!udata.public_repos) return;
                            return fetch('https://api.github.com/users/' + githubUsername + '/repos?per_page=100&type=owner');
                        })
                        .then(function(r) { if (r && r.ok) return r.json(); })
                        .then(function(repos) {
                            if (!repos) return;
                            var totalStars = repos.reduce(function(s, repo) { return s + (repo.stargazers_count || 0); }, 0);
                            var cacheStr = sessionStorage.getItem('gh_profile_' + githubUsername);
                            if (cacheStr) {
                                try {
                                    var cobj = JSON.parse(cacheStr);
                                    cobj._total_stars = totalStars;
                                    sessionStorage.setItem('gh_profile_' + githubUsername, JSON.stringify(cobj));
                                } catch(e) {}
                            }
                            var statCard = document.getElementById('ghstat-' + githubUsername);
                            if (statCard) {
                                var starsEl = statCard.querySelector('.gh-stat-stars');
                                if (starsEl) starsEl.textContent = totalStars >= 1000 ? (totalStars/1000).toFixed(1)+'k' : totalStars;
                            }
                        })
                        .catch(function() {});
                }
            } else if (p.preview_image_url && p.preview_image_url.trim() && !p.preview_image_url.trim().endsWith('/')) {
                avatarEl.src = getPartnerImageUrl(p.preview_image_url);
            } else {
                avatarEl.replaceWith(buildAvatarPlaceholder(p.owner_name));
                avatarEl = null;
            }
            avatarEl && a.appendChild(avatarEl);
            if (p.owner_name) {
                var nameEl = document.createElement('span');
                nameEl.className = 'partner-list-name';
                nameEl.style.fontSize = '12px';
                nameEl.textContent = p.owner_name.trim();
                a.appendChild(nameEl);
            }
            listTrack.appendChild(a);
        });
        listStrip.style.display = 'block';
    }
    var repos = data.Cards || data.cards || data.repositories || data.repos || data.products || [];
    repos = repos.slice();
    repos.forEach(function(repoEntry) { repoEntry.is_github_listing = true; });
    registerGithubProducts(repos);
    if (productsData && productsData.products) {
        var apiGithubProds = productsData.products.filter(function(p) { return p.file_product === false; });
        apiGithubProds.forEach(function(p) {
            var alreadyIn = repos.some(function(r) {
                if (r.title && p.title && r.title.trim().toLowerCase() === p.title.trim().toLowerCase()) return true;
                if (r.github_url && p.github_url && r.github_url.trim() === p.github_url.trim()) return true;
                if (r.id !== undefined && p.id !== undefined && r.id === p.id) return true;
                return false;
            });
            if (!alreadyIn) repos.push(p);
        });
    }
    var seenKeys = {};
    repos = repos.filter(function(p) {
        var key = (p.title || '').trim().toLowerCase() + '|' + (p.github_url || '').trim();
        if (seenKeys[key]) return false;
        seenKeys[key] = true;
        return true;
    });
    if (!repos || repos.length === 0) {
        grid.innerHTML = '<div class="empty-state">No repositories found. Check ./config/github.json</div>';
        return;
    }
    grid.innerHTML = '';
    repos.sort(function(a, b) { return (a.id || 0) - (b.id || 0); });
    repos.forEach(function(p) {
        grid.appendChild(buildProductCard(p, false));
    });
    applyShinyTextToEls();
    populateViewCounts(grid);
}

function renderGithubProfileStats(container, udata, username, profileEntry) {
    if (!container || !udata) return;
    var existing = document.getElementById('ghstat-' + username);
    if (existing) return;
    var card = document.createElement('div');
    card.id = 'ghstat-' + username;
    card.style.cssText = 'background:rgba(22,5,40,0.65);backdrop-filter:blur(14px);border:1px solid rgba(139,0,160,0.28);border-radius:14px;padding:14px 20px;display:flex;align-items:center;gap:14px;min-width:260px;flex:1;';
    var avatarUrl = udata.avatar_url || ('https://avatars.githubusercontent.com/' + username + '?size=80');
    var repoCount = udata.public_repos || 0;
    var followers = udata.followers || 0;
    var following = udata.following || 0;
    var cachedStr = sessionStorage.getItem('gh_profile_' + username);
    var totalStars = 0;
    if (cachedStr) { try { totalStars = JSON.parse(cachedStr)._total_stars || 0; } catch(e) {} }
    var displayFollowers = followers >= 1000 ? (followers/1000).toFixed(1)+'k' : followers;
    var displayFollowing = following >= 1000 ? (following/1000).toFixed(1)+'k' : following;
    var displayRepos = repoCount >= 1000 ? (repoCount/1000).toFixed(1)+'k' : repoCount;
    var displayStars = totalStars >= 1000 ? (totalStars/1000).toFixed(1)+'k' : totalStars;
    card.innerHTML =
        '<img src="'+avatarUrl+'" alt="'+escHtml(udata.login||username)+'" style="width:54px;height:54px;border-radius:50%;border:2px solid rgba(139,0,160,0.45);object-fit:cover;flex-shrink:0;">' +
        '<div style="display:flex;flex-direction:column;gap:4px;flex:1;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
                '<a href="'+(udata.html_url||('#'))+'" target="_blank" rel="noopener noreferrer" style="font-size:14px;font-weight:700;color:#d4a0ff;text-decoration:none;">' + escHtml(udata.name || udata.login || username) + '</a>' +
                (udata.login ? '<span style="font-size:11px;color:var(--text-tertiary);">@'+escHtml(udata.login)+'</span>' : '') +
            '</div>' +
            '<div style="display:flex;gap:14px;flex-wrap:wrap;">' +
                '<span style="font-size:12px;color:var(--text-secondary);"><strong style="color:#c97eff">'+displayFollowers+'</strong> followers · <strong style="color:#c97eff">'+displayFollowing+'</strong> following</span>' +
            '</div>' +
            '<div style="display:flex;gap:14px;flex-wrap:wrap;">' +
                '<span style="font-size:12px;color:var(--text-secondary);">Repos: <strong style="color:#c97eff">'+displayRepos+'</strong></span>' +
                '<span style="font-size:12px;color:var(--text-secondary);">Total Stars: <strong class="gh-stat-stars" style="color:#c97eff">'+(totalStars > 0 ? displayStars : '...')+'</strong></span>' +
            '</div>' +
        '</div>';
    container.appendChild(card);
}

async function downloadLauncher() {
    var ua = navigator.userAgent || '';
    var filePath = null;
    var fileName = null;
    if (/Mac|iPhone|iPad|iPod/i.test(ua) && !/Windows/i.test(ua)) {
        filePath = (config && config.macos_launcher_file_path) ? config.macos_launcher_file_path : null;
        fileName = filePath ? filePath.split('/').pop() : null;
    } else if (/Linux/i.test(ua) && !/Android/i.test(ua) && !/Windows/i.test(ua)) {
        filePath = (config && config.linux_launcher_file_path) ? config.linux_launcher_file_path : null;
        fileName = filePath ? filePath.split('/').pop() : null;
    } else {
        filePath = (config && config.windows_launcher_file_path) ? config.windows_launcher_file_path : null;
        fileName = filePath ? filePath.split('/').pop() : null;
    }
    if (!filePath) {
        showBanner('Launcher file path is not configured.', 'error');
        return;
    }
    try {
        var headRes = await fetch(filePath, { method: 'HEAD' });
        if (!headRes.ok) {
            showBanner('Launcher file not found. Please try again later.', 'error');
            return;
        }
    } catch(e) {
        showBanner('Launcher file not found. Please try again later.', 'error');
        return;
    }
    var a = document.createElement('a');
    a.href = filePath;
    a.download = fileName || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', async function() {
    (function() {
        var style = document.createElement('style');
        style.textContent = '@keyframes shinyMove{0%{background-position:150% center}100%{background-position:-50% center}}@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}.lc-insufficient{opacity:0.5;border:1px solid rgba(244,67,54,0.4)!important;}.account-type-badge-widget{display:inline-flex;align-items:center;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:0.03em;}';
        document.head.appendChild(style);
    })();

    if (window.location.pathname.includes('login_register')) {
        await loadConfig();
        initAuthPage();
        return;
    }

    await loadConfig();
    await checkLoginStatus();
    RWL.ensureCosmeticStyles();
    if (currentUser && document.getElementById('productsGrid')) RWL.trackEvent('visit_store');
    applyConfigVisibility();
    setupNavigation();
    setupTabs();
    setupDashboard();
    setupLoginRegisterButtons();
    setupProfileSidebar();
    updateLanguage();
    updateCartBadge();

    (function() {
        var pendingBanner = sessionStorage.getItem('rickware_pending_banner');
        if (pendingBanner) {
            sessionStorage.removeItem('rickware_pending_banner');
            try {
                var pb = JSON.parse(pendingBanner);
                if (pb && pb.message) showBanner(pb.message, pb.type || 'success');
            } catch(e) {}
        }
    })();

    (function() {
        var leftBtn = document.getElementById('catSliderLeft');
        var rightBtn = document.getElementById('catSliderRight');
        var scroll = document.getElementById('categoryTabsScroll');
        if (leftBtn && scroll) leftBtn.addEventListener('click', function() { scroll.scrollBy({ left: -200, behavior: 'smooth' }); });
        if (rightBtn && scroll) rightBtn.addEventListener('click', function() { scroll.scrollBy({ left: 200, behavior: 'smooth' }); });
    })();

    if (config.discord_invite) {
        var db = document.getElementById('discordBtn');
        if (db) {
            db.href = config.discord_invite;
            db.target = '_blank';
            db.rel = 'noopener noreferrer';
        }
    }

    runWhenVisible(document.getElementById('partnerTab'), function() { loadPartners(); loadPartnersList(); });
    runWhenVisible(document.getElementById('newsTab'), loadNews);
    runWhenVisible(document.getElementById('qaTab'), loadQA);
    setupDropdowns();
    setupMobileMenu();
    setupQAToggles();
    setupCheckoutModal();
    applyConfigDefaults();
    loadProducts().then(function() {
        setupSearch();
        setupPerPageSelect();
    });

    var nameplateLcWidget = document.getElementById('nameplateLcDisplay');
    if (nameplateLcWidget) {
        nameplateLcWidget.addEventListener('click', function(e) {
            e.stopPropagation();
            var bankNavBtn = document.querySelector('.nav-item[data-page="bank"]');
            if (bankNavBtn) bankNavBtn.click();
        });
    }

    var githubTabBtn = document.querySelector('.top-tab[data-tab="github"]');
    if (githubTabBtn) {
        githubTabBtn.addEventListener('click', function() {
            var ghGrid = document.getElementById('githubGrid');
            if (ghGrid && ghGrid.querySelector('.news-loading')) {
                loadGithubTab().then(function() { applyShinyTextToEls(); });
            }
        });
    }

    applyShinyTextToEls();
    setTimeout(applyShinyTextToEls, 800);
});

function runWhenVisible(element, callback) {
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
        callback();
        return;
    }
    var observer = new IntersectionObserver(function(entries) {
        var visible = entries.some(function(entry) { return entry.isIntersecting; });
        if (!visible) return;
        observer.disconnect();
        callback();
    }, { rootMargin: '200px' });
    observer.observe(element);
}

function setupMobileMenu() {
    var btn = document.getElementById('mobileMenuBtn');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    var closeBtn = document.getElementById('sidebarCloseBtn');
    function openSidebar() {
        if (sidebar) sidebar.classList.add('mobile-active');
        if (overlay) overlay.classList.add('mobile-active');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('mobile-active');
        if (overlay) overlay.classList.remove('mobile-active');
        document.body.style.overflow = '';
    }
    if (btn) btn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

function setupQAToggles() {
    document.addEventListener('click', function(e) {
        var toggle = e.target.closest('.qa-toggle');
        if (!toggle) return;
        var item = toggle.closest('.qa-item');
        if (!item) return;
        item.classList.toggle('open');
    });
}

function setupCheckoutModal() {
    var openBtn = document.getElementById('dropdownCheckoutBtn');
    var overlay = document.getElementById('checkoutModalOverlay');
    var closeBtn = document.getElementById('checkoutModalClose');
    function closeCheckoutOverlay() {
        if (overlay) {
            overlay.classList.remove('open');
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    }
    if (openBtn) openBtn.addEventListener('click', function() { openCheckoutModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutOverlay);
    if (overlay) overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeCheckoutOverlay();
    });
}

function openCheckoutModal() {
    var overlay = document.getElementById('checkoutModalOverlay');
    var inner = document.getElementById('checkoutModalInner');
    if (!overlay || !inner) return;
    var cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) cartDropdown.classList.remove('open');
    var items = cart || [];
    var total = items.reduce(function(sum, item) {
        var p = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
        return sum + p * (item.qty || 1);
    }, 0);
    var payments = [
        { name: 'Bitcoin (BTC)', icon: '₿', available: true, coin: 'btc' },
        { name: 'Ethereum (ETH)', icon: 'Ξ', available: true, coin: 'eth' },
        { name: 'Solana (SOL)', icon: '◎', available: true, coin: 'sol' },
        { name: 'BNB (BNB)', icon: '⬡', available: true, coin: 'bnb' },
        { name: 'TRON (TRX)', icon: '⚡', available: true, coin: 'trx' },
        { name: 'Litecoin (LTC)', icon: 'Ł', available: true, coin: 'ltc' },
        { name: 'Bitcoin Cash (BCH)', icon: '₿', available: true, coin: 'bch' },
        { name: 'Dogecoin (DOGE)', icon: 'Ð', available: true, coin: 'doge' },
        { name: 'Amazon Voucher', icon: '📦', available: true, coin: null },
        { name: 'Paysafecard', icon: '🎮', available: true, coin: null },
        { name: 'Lab Coins (LC)', icon: '🪙', available: true, lc: true, coin: null },
        { name: 'PayPal', icon: '🅿', available: false, coin: null },
        { name: 'Credit Card', icon: '💳', available: false, coin: null },
        { name: 'Bank Transfer', icon: '🏦', available: false, coin: null },
        { name: 'Klarna', icon: '🛍', available: false, coin: null }
    ];
    var html = '<div class="coin-checkout-modal">';
    html += '<div class="coin-checkout-header"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><h2>Checkout</h2></div>';
    if (items.length === 0) {
        html += '<p style="color:var(--text-tertiary);text-align:center;padding:30px 0;">Your cart is empty.</p>';
    } else {
        html += '<div class="coin-checkout-summary glass-card">';
        items.forEach(function(item) {
            var p = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
            html += '<div class="coin-checkout-row"><span>' + escHtml(item.name) + (item.qty > 1 ? ' ×' + item.qty : '') + '</span><strong>' + (p > 0 ? formatUSD(p * (item.qty || 1)) : 'Free') + '</strong></div>';
        });
        html += '<div class="coin-checkout-divider"></div>';
        html += '<div class="coin-checkout-row coin-price-row"><span>Total</span><strong>' + formatUSD(total) + '</strong></div>';
        html += '</div>';
        html += '<div class="checkout-coupon-row"><input type="text" placeholder="Coupon code (optional)" class="checkout-coupon-input" id="checkoutCoupon"><button class="checkout-coupon-apply" onclick="applyCheckoutCoupon()">Apply</button></div>';
        html += '<div class="coin-checkout-payment">';
        html += '<div class="coin-checkout-payment-label">Select Payment Method</div>';
        html += '<div class="coin-payment-methods">';
        var lcRate = currentLcUsdRate();
        payments.forEach(function(pm) {
            if (pm.available) {
                var label = pm.icon + ' ' + pm.name;
                var coinAttr = pm.coin ? ' data-coin="' + pm.coin + '"' : ' data-coin=""';
                if (pm.lc) {
                    var lcCost = Math.ceil(total / lcRate);
                    var userLc = labCoinsBalance || 0;
                    var canAfford = userLc >= lcCost;
                    label += ' <span style="font-size:10px;opacity:0.75;">(' + lcCost + ' LC' + (canAfford ? '' : ' — insufficient') + ')</span>';
                    html += '<button class="coin-payment-btn' + (!canAfford ? ' lc-insufficient' : '') + '"' + coinAttr + ' onclick="selectCheckoutPayment(this)" ' + (!canAfford ? 'title="You need ' + lcCost + ' LC but have ' + userLc + ' LC"' : '') + '>' + label + '</button>';
                } else {
                    html += '<button class="coin-payment-btn"' + coinAttr + ' onclick="selectCheckoutPayment(this)">' + label + '</button>';
                }
            } else {
                html += '<button class="coin-payment-btn" disabled style="opacity:0.4;cursor:not-allowed;">' + pm.icon + ' ' + pm.name + ' <span style="font-size:9px;">Soon</span></button>';
            }
        });
        html += '</div></div>';
        html += '<div class="coin-checkout-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-right:6px;vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Crypto payments are processed automatically via NowPayments. Manual methods (Amazon, Paysafecard, LC) require a Discord ticket.</div>';
        html += '<button class="coin-checkout-confirm-btn" onclick="confirmCheckout()">Place Order →</button>';
    }
    html += '</div>';
    inner.innerHTML = html;
    overlay.classList.add('open');
    overlay.classList.remove('active');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function applyCheckoutCoupon() {
    applyCouponInput('checkoutCoupon');
}

function selectCheckoutPayment(btn) {
    var grid = btn.closest('.coin-payment-methods');
    if (grid) grid.querySelectorAll('.coin-payment-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
}

async function confirmCheckout() {
    var inner = document.getElementById('checkoutModalInner');
    var selectedBtn = inner ? inner.querySelector('.coin-payment-btn.active') : null;
    if (!selectedBtn) {
        showBanner('Please select a payment method.', 'error');
        return;
    }
    if (cart.length === 0 || !inner) return;
    await runCheckout({
        overlayId: 'checkoutModalOverlay',
        inner: inner,
        items: cart.slice(),
        selectedBtn: selectedBtn,
        couponCode: checkoutCouponValue(document.getElementById('checkoutCoupon')),
        onComplete: function() {
            cart = [];
            updateCartBadge();
            if (typeof renderCartDropdown === 'function') renderCartDropdown();
        }
    });
}

var currentPage = 1;

function setupPerPageSelect() {
    var sel = document.getElementById('perPageSelect');
    if (sel) {
        sel.addEventListener('change', function() {
            currentPage = 1;
            renderProducts(currentCategory);
        });
    }
}

var productsData = null;
var currentCategory = 'all';
var searchActiveQuery = '';

function showMaintenanceScreen() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.style.display = 'flex';
    grid.style.alignItems = 'center';
    grid.style.justifyContent = 'center';
    grid.style.minHeight = '65vh';
    grid.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;text-align:center;padding:40px 60px;">' +
        '<img src="' + (function(){ var s = document.querySelector('script[src*="main.js"]'); if(s){ var u = new URL(s.src); return u.href.replace(/js\/main\.js.*$/, '') + 'images/main/rickware-labs_maintenance_waifu.webp'; } return 'images/main/rickware-labs_maintenance_waifu.webp'; })() + '" alt="Maintenance" style="width:200px;height:200px;object-fit:contain;filter:drop-shadow(0 0 32px rgba(180,80,255,0.6));flex-shrink:0;" onerror="this.style.display=\'none\'">' +
        '<div>' +
        '<div style="font-size:32px;font-weight:700;color:#c97eff;margin-bottom:16px;letter-spacing:0.01em;">We\'ll be back shortly!</div>' +
        '<div style="font-size:17px;color:var(--text-secondary);max-width:500px;line-height:1.8;">The store is currently undergoing maintenance.<br>Our team is working hard to bring everything back online.<br>Please check back in a few minutes.</div>' +
        '</div>' +
        '</div>';
}

async function loadProducts() {
    if (!document.getElementById('productsGrid')) return;
    if (config.maintenance_mode === true) {
        showMaintenanceScreen();
        return;
    }
    var loaded = false;
    try {
        var res = await fetch('./config/products.json');
        if (res.ok) {
            productsData = await res.json();
            loaded = true;
        }
    } catch(e) {}
    if (!loaded || !productsData) {
        showMaintenanceScreen();
        return;
    }
    await loadGithubProductRegistry();
    buildCategoryTabs();
    renderProducts('all');
    setupSortSelect();
}

function buildCategoryTabs() {
    var bar = document.getElementById('categoryTabsBar');
    if (!bar || !productsData) return;
    var cats = {};
    if (productsData.categorys && productsData.categorys.length > 0) {
        var c = productsData.categorys[0];
        Object.keys(c).forEach(function(k) { cats[c[k]] = true; });
    }
    delete cats['Coming Soon'];
    bar.innerHTML = '<div class="category-tabs-slider-wrapper"><button class="category-slider-arrow category-slider-arrow-left" id="catSliderLeft" aria-label="Scroll left" style="display:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button><div class="category-tabs-scroll" id="categoryTabsScroll"><button class="category-tab active" data-category="all">All</button></div><button class="category-slider-arrow category-slider-arrow-right" id="catSliderRight" aria-label="Scroll right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div>';
    var scroll = document.getElementById('categoryTabsScroll');
    var hasFree = productsData.products && productsData.products.some(function(p) { return isFreeProduct(p); });
    if (hasFree) {
        var freeBtn = document.createElement('button');
        freeBtn.className = 'category-tab category-tab-free';
        freeBtn.setAttribute('data-category', 'free');
        freeBtn.textContent = 'Free';
        freeBtn.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(function(b) { b.classList.remove('active'); });
            freeBtn.classList.add('active');
            currentCategory = 'free';
            currentPage = 1;
            searchActiveQuery = '';
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderProducts('free');
        });
        var allBtn = scroll.querySelector('[data-category="all"]');
        if (allBtn && allBtn.nextSibling) {
            scroll.insertBefore(freeBtn, allBtn.nextSibling);
        } else {
            scroll.appendChild(freeBtn);
        }
    }
    Object.keys(cats).forEach(function(name) {
        var btn = document.createElement('button');
        btn.className = 'category-tab';
        btn.setAttribute('data-category', name);
        btn.setAttribute('translate', 'no');
        btn.textContent = name;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentCategory = name;
            currentPage = 1;
            searchActiveQuery = '';
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderProducts(name);
        });
        scroll.appendChild(btn);
    });
    var hasSoon = productsData.products && productsData.products.some(function(p) {
        var b = (p.banner || '').toLowerCase().trim();
        return b.indexOf('soon') >= 0 || b.indexOf('coming soon') >= 0;
    });
    if (hasSoon) {
        var soonBtn = document.createElement('button');
        soonBtn.className = 'category-tab category-tab-soon';
        soonBtn.setAttribute('data-category', 'coming-soon');
        soonBtn.textContent = 'Coming Soon';
        soonBtn.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(function(b) { b.classList.remove('active'); });
            soonBtn.classList.add('active');
            currentCategory = 'coming-soon';
            currentPage = 1;
            searchActiveQuery = '';
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderProducts('coming-soon');
        });
        scroll.appendChild(soonBtn);
    }
    if (currentUser) {
        var ownedBtn = document.createElement('button');
        ownedBtn.className = 'category-tab category-tab-owned';
        ownedBtn.setAttribute('data-category', 'owned');
        ownedBtn.title = 'Products you own or can use with your account';
        ownedBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg><span>Owned</span>';
        ownedBtn.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(function(b) { b.classList.remove('active'); });
            ownedBtn.classList.add('active');
            currentCategory = 'owned';
            currentPage = 1;
            searchActiveQuery = '';
            ownedSearchQuery = '';
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderProducts('owned');
        });
        scroll.insertBefore(ownedBtn, scroll.firstChild);
    }
    var allBtn2 = scroll.querySelector('[data-category="all"]');
    if (allBtn2) {
        allBtn2.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(function(b) { b.classList.remove('active'); });
            allBtn2.classList.add('active');
            currentCategory = 'all';
            currentPage = 1;
            searchActiveQuery = '';
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderProducts('all');
        });
    }
    var leftBtn = document.getElementById('catSliderLeft');
    var rightBtn = document.getElementById('catSliderRight');
    function updateArrows() {
        if (!scroll) return;
        var atStart = scroll.scrollLeft <= 2;
        var atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 2;
        if (leftBtn) leftBtn.style.display = atStart ? 'none' : '';
        if (rightBtn) rightBtn.style.display = atEnd ? 'none' : '';
    }
    if (leftBtn) leftBtn.addEventListener('click', function() { scroll.scrollBy({ left: -200, behavior: 'smooth' }); });
    if (rightBtn) rightBtn.addEventListener('click', function() { scroll.scrollBy({ left: 200, behavior: 'smooth' }); });
    if (scroll) scroll.addEventListener('scroll', updateArrows);
    setTimeout(updateArrows, 100);
}

function setupSortSelect() {
    var sel = document.getElementById('sortSelect');
    if (sel) {
        sel.addEventListener('change', function() {
            renderProducts(currentCategory);
        });
    }
}

function getProductPriceInfo(p) {
    if (p.price !== null && p.price !== undefined && p.price !== '') {
        return { type: 'fixed', price: p.price, original: p.original_price || null };
    }
    var cats = p.license_categories && p.license_categories[0] ? p.license_categories[0] : {};
    var keys = Object.keys(cats);
    if (keys.length === 0) return { type: 'free' };
    if (keys.length === 1 && keys[0] === 'free') return { type: 'free' };
    var prices = p.license_categorie_prices && p.license_categorie_prices[0] ? p.license_categorie_prices[0] : {};
    var vals = [];
    keys.forEach(function(k) {
        if (k === 'free') return;
        var v = prices[k];
        if (v !== undefined && v !== null) {
            var num = parseFloat(String(v).replace(',', '.'));
            if (!isNaN(num)) vals.push(num);
        }
    });
    if (vals.length === 0) return { type: 'free' };
    if (vals.length === 1) return { type: 'single', price: vals[0] };
    vals.sort(function(a,b){return a-b;});
    return { type: 'range', min: vals[0], max: vals[vals.length-1] };
}

function formatUSD(val) {
    return '$' + parseFloat(val).toFixed(2).replace('.', ',');
}

function renderPriceArea(p) {
    var info = getProductPriceInfo(p);
    var html = '<div class="product-price-area">';
    if (info.type === 'free') {
        html += '<div class="product-price"><span class="product-price-free">$0.00</span><span class="product-price-free-tag">Free</span></div>';
    } else if (info.type === 'fixed') {
        html += '<div class="product-price">' + formatUSD(info.price) + '</div>';
        if (info.original) html += '<div class="product-price-original">' + formatUSD(info.original) + '</div>';
    } else if (info.type === 'single') {
        html += '<div class="product-price-range">' + formatUSD(info.price) + '</div>';
    } else {
        html += '<div class="product-price-range">' + formatUSD(info.min) + ' – ' + formatUSD(info.max) + '</div>';
    }
    html += '</div>';
    return html;
}

var githubProductUrlSet = {};

function normalizeGithubUrl(rawUrl) {
    return String(rawUrl || '').trim().toLowerCase().replace(/\.git$/, '').replace(/\/+$/, '');
}

function registerGithubProducts(productList) {
    if (!Array.isArray(productList)) return;
    productList.forEach(function(entry) {
        var normalizedUrl = normalizeGithubUrl(entry && entry.github_url);
        if (normalizedUrl) githubProductUrlSet[normalizedUrl] = true;
    });
}

async function loadGithubProductRegistry() {
    try {
        var response = await fetch('./config/github.json');
        if (!response.ok) return;
        var githubData = await response.json();
        registerGithubProducts(githubData.Cards || githubData.cards || githubData.repositories || githubData.repos || githubData.products || []);
    } catch (error) {
        console.error('GitHub registry could not be loaded:', error);
    }
}

function isGithubProduct(p) {
    if (!p) return false;
    if (p.file_product === false) return true;
    if (p.is_github_listing === true) return true;
    var normalizedUrl = normalizeGithubUrl(p.github_url);
    return normalizedUrl !== '' && githubProductUrlSet[normalizedUrl] === true;
}

function openGithubProductPage(rawUrl) {
    var targetUrl = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(targetUrl)) return;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function formatCompactCount(rawValue) {
    var numericValue = parseInt(rawValue, 10);
    if (isNaN(numericValue) || numericValue < 0) numericValue = 0;
    if (numericValue >= 1000000) return (numericValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (numericValue >= 1000) return (numericValue / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(numericValue);
}

function buildProductStatsHtml(p, iconSize) {
    var totalUsers = formatCompactCount(p.total_users);
    var totalDownloads = formatCompactCount(p.total_downloads);
    var viewsKey = isGithubProduct(p) ? normalizeGithubUrl(p.github_url) : String(p.product_id || '');
    var viewsType = isGithubProduct(p) ? 'github' : 'product';
    var productKey = isGithubProduct(p) ? '' : String(p.product_id || '');
    return '<div class="product-stats-inline">' +
        (isGithubProduct(p) ? '' : '<span class="product-stat-item" title="Active users (total licenses)" data-stat-field="users" data-stat-product="' + escHtml(productKey) + '">' +
        '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        '<span class="product-stat-value">' + totalUsers + '</span></span>' +
        '<span class="product-stat-item" title="Total downloads" data-stat-field="downloads" data-stat-product="' + escHtml(productKey) + '">' +
        '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        '<span class="product-stat-value">' + totalDownloads + '</span></span>') +
        (viewsKey ? '<span class="product-stat-item product-stat-views" title="Unique views" data-views-type="' + viewsType + '" data-views-key="' + escHtml(viewsKey) + '">' +
        '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '<span class="product-stat-value">0</span></span>' : '') +
        (viewsKey ? '<span class="product-stat-item product-stat-live" title="People viewing this right now" data-live-item="' + viewsType + ':' + escHtml(viewsKey) + '">' +
        '<span class="product-live-dot" aria-hidden="true"></span>' +
        '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '<span class="product-stat-value">0</span></span>' : '') +
        '</div>';
}

var productStatsRequest = null;
var productStatsLoadedAt = 0;

function loadProductStats() {
    if (productStatsRequest && Date.now() - productStatsLoadedAt < 60000) return productStatsRequest;
    productStatsLoadedAt = Date.now();
    productStatsRequest = fetch(apiUrl('/api/products/stats')).then(function(response) {
        return response.ok ? response.json() : { stats: {} };
    }).then(function(data) {
        return data.stats || {};
    }).catch(function() {
        return {};
    });
    return productStatsRequest;
}

function populateProductStats(scope) {
    var nodes = scope.querySelectorAll('[data-stat-product]');
    if (!nodes.length) return;
    loadProductStats().then(function(stats) {
        nodes.forEach(function(node) {
            var row = stats[node.getAttribute('data-stat-product')] || {};
            var valueEl = node.querySelector('.product-stat-value');
            if (valueEl) valueEl.textContent = formatCompactCount(row[node.getAttribute('data-stat-field')] || 0);
        });
    });
}

function populateViewCounts(root) {
    var scope = root || document;
    populateProductStats(scope);
    if (!window.RWLViews) return;
    ['product', 'github'].forEach(function(type) {
        var nodes = scope.querySelectorAll('[data-views-type="' + type + '"]');
        if (!nodes.length) return;
        RWLViews.load(type).then(function(views) {
            nodes.forEach(function(node) {
                var value = views[node.getAttribute('data-views-key')] || 0;
                var valueEl = node.querySelector('.product-stat-value');
                if (valueEl) valueEl.textContent = formatCompactCount(value);
            });
        });
    });
}

function buildGithubIconSvg(iconSize) {
    return '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';
}

function isFreeProduct(p) {
    var info = getProductPriceInfo(p);
    return info.type === 'free';
}

function isInWishlist(p) {
    return wishlist.some(function(w) { return w._uid === (p.category + '_' + p.id); });
}

function toggleWishlistProduct(p) {
    var uid = p.category + '_' + p.id;
    var idx = wishlist.findIndex(function(w) { return w._uid === uid; });
    if (idx >= 0) {
        wishlist.splice(idx, 1);
    } else {
        wishlist.push(Object.assign({ _uid: uid, name: p.title, price: null }, p));
    }
    var badge = document.getElementById('wishlistBadge');
    if (badge) badge.textContent = wishlist.length;
    renderWishlistDropdown();
}

function buildProductCard(p, showCategory, mode) {
    var ownedMode = mode === 'owned';
    var card = document.createElement('div');
    card.className = 'product-card';
    if (p.id) card.setAttribute('data-product-id', String(p.id));

    var imgArea = document.createElement('div');
    imgArea.className = 'product-image-area';

    if (p.preview_image_url && p.preview_image_url.trim()) {
        var img = document.createElement('img');
        img.className = 'product-preview-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = productCardImageUrl(p.preview_image_url);
        img.alt = p.title;
        img.onerror = function() { img.remove(); };
        imgArea.appendChild(img);
    }

    var imageCount = 1;
    for (var _ic = 1; _ic <= 8; _ic++) { if (p['image_url_' + _ic] && p['image_url_' + _ic].trim()) imageCount++; }
    if (imageCount > 1 || (p.preview_image_url && p.preview_image_url.trim())) {
        var imgCountBadge = document.createElement('div');
        imgCountBadge.className = 'product-img-count-badge';
        imgCountBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>' + imageCount + '</span>';
        imgArea.appendChild(imgCountBadge);
    }

    if (p.banner && p.banner.trim()) {
        var bannerEl = document.createElement('div');
        bannerEl.className = 'product-banner-label';
        bannerEl.setAttribute('translate', 'no');
        if (p.banner_color && p.banner_color.trim()) {
            bannerEl.style.backgroundColor = p.banner_color.trim();
        }
        bannerEl.textContent = p.banner;
        imgArea.appendChild(bannerEl);
    }

    if (p.owner_name && p.owner_name.trim()) {
        var ownerEl = document.createElement('div');
        ownerEl.className = 'product-owner-label';
        ownerEl.textContent = 'by ' + p.owner_name;
        imgArea.appendChild(ownerEl);
    }

    if (p.version && p.version.trim()) {
        var verEl = document.createElement('div');
        verEl.className = 'product-version-label';
        verEl.setAttribute('translate', 'no');
        verEl.textContent = p.version;
        imgArea.appendChild(verEl);
    }

    if (p.github_url && p.github_url.trim()) {
        var match = p.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
        if (match) {
            var repo = match[1].replace(/\.git$/, '');
            var starsEl = document.createElement('div');
            starsEl.className = 'product-github-stars';
            starsEl.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ...';
            imgArea.appendChild(starsEl);
            var cacheKey = 'gh_stars_' + repo;
            var cached = sessionStorage.getItem(cacheKey);
            if (cached !== null) {
                var count = parseInt(cached);
                var display = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count;
                starsEl.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + display;
            } else {
                fetch('https://api.github.com/repos/' + repo)
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.stargazers_count !== undefined) {
                            sessionStorage.setItem(cacheKey, String(data.stargazers_count));
                            var c = data.stargazers_count >= 1000 ? (data.stargazers_count / 1000).toFixed(1) + 'k' : data.stargazers_count;
                            starsEl.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + c;
                        }
                    }).catch(function() { starsEl.remove(); });
            }
        }
    }

    card.appendChild(imgArea);

    var body = document.createElement('div');
    body.className = 'product-body';

    var titleEl = document.createElement('div');
    titleEl.className = 'product-title-row';
    var titleText = document.createElement('div');
    titleText.className = 'product-title';
    titleText.setAttribute('translate', 'no');
    titleText.innerHTML = '<span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">' + escHtml(p.title) + '</span>';
    titleEl.appendChild(titleText);
    if (showCategory && p.category) {
        var catBadge = document.createElement('span');
        catBadge.className = 'product-card-category-badge';
        catBadge.setAttribute('translate', 'no');
        catBadge.textContent = p.category;
        titleEl.appendChild(catBadge);
    }
    body.appendChild(titleEl);

    if (p.description && p.description.trim()) {
        var desc = document.createElement('div');
        desc.className = 'product-description';
        desc.setAttribute('translate', 'no');
        desc.textContent = p.description;
        body.appendChild(desc);
    }

    var togglesDiv = document.createElement('div');
    togglesDiv.className = 'product-auto-toggles';
    var togglesGroup = document.createElement('div');
    togglesGroup.className = 'product-toggles-group';
    if (p.auto_setup) {
        var setupChecked = p.enabled_setup === true;
        var lbl1 = document.createElement('label');
        lbl1.className = 'auto-toggle-label';
        lbl1.innerHTML = '<input type="checkbox"' + (setupChecked ? ' checked' : '') + '> Auto Setup';
        lbl1.querySelector('input').addEventListener('click', function(e) { e.stopPropagation(); });
        togglesGroup.appendChild(lbl1);
    }
    if (p.auto_update) {
        var updateChecked = p.enabled_update === true;
        var lbl2 = document.createElement('label');
        lbl2.className = 'auto-toggle-label';
        lbl2.innerHTML = '<input type="checkbox"' + (updateChecked ? ' checked' : '') + '> Auto Update';
        lbl2.querySelector('input').addEventListener('click', function(e) { e.stopPropagation(); });
        togglesGroup.appendChild(lbl2);
    }
    togglesDiv.appendChild(togglesGroup);
    togglesDiv.insertAdjacentHTML('beforeend', buildProductStatsHtml(p, 13));
    body.appendChild(togglesDiv);

    card.appendChild(body);

    var footer = document.createElement('div');
    footer.className = 'product-footer';

    var stockEl = document.createElement('div');
    stockEl.className = 'product-stock';
    stockEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> ' + (p.Stock || '∞');
    footer.appendChild(stockEl);
    footer.innerHTML += renderPriceArea(p);
    card.appendChild(footer);

    var actions = document.createElement('div');
    actions.className = 'product-card-actions';

    var isFree = isFreeProduct(p);

    if (ownedMode) {
        var launchBtn = document.createElement('button');
        launchBtn.className = 'product-btn product-btn-launch';
        launchBtn.title = isGithubProduct(p) ? 'Open the GitHub repository in a new tab' : 'Install or start this tool in the Rickware - Labs© Launcher';
        launchBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg> Launch';
        launchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            launchOwnedProduct(p, launchBtn);
        });
        actions.appendChild(launchBtn);
        if (p.discord_url && p.discord_url.trim()) {
            var ownedDiscordBtn = document.createElement('a');
            ownedDiscordBtn.className = 'product-btn product-btn-discord';
            ownedDiscordBtn.href = p.discord_url;
            ownedDiscordBtn.target = '_blank';
            ownedDiscordBtn.rel = 'noopener noreferrer';
            ownedDiscordBtn.title = 'Open the Discord server of this product';
            ownedDiscordBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg>';
            ownedDiscordBtn.addEventListener('click', function(e) { e.stopPropagation(); });
            actions.appendChild(ownedDiscordBtn);
        }
        card.appendChild(actions);
        card.addEventListener('click', function() { openProductModal(p, { infoOnly: true }); });
        return card;
    }

    var wishBtn = document.createElement('button');
    wishBtn.className = 'product-btn product-btn-wishlist' + (isInWishlist(p) ? ' active' : '');
    wishBtn.title = 'Wishlist';
    wishBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isInWishlist(p) ? '#c97eff' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    wishBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleWishlistProduct(p);
        var inWL = isInWishlist(p);
        wishBtn.classList.toggle('active', inWL);
        wishBtn.querySelector('svg').setAttribute('fill', inWL ? '#c97eff' : 'none');
    });
    actions.appendChild(wishBtn);

    if (isFree) {
        var dlBtn = document.createElement('button');
        dlBtn.className = 'product-btn product-btn-download';
        if (isGithubProduct(p)) {
            var ghUrl = p.github_url && p.github_url.trim() ? p.github_url : '';
            dlBtn.title = 'Open the GitHub repository in a new tab';
            dlBtn.innerHTML = buildGithubIconSvg(13) + ' Download via GitHub';
            dlBtn.addEventListener('click', function(e) { e.stopPropagation(); openGithubProductPage(ghUrl); });
        } else {
            dlBtn.title = 'Download this product for free';
            dlBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Free';
            dlBtn.addEventListener('click', function(e) { e.stopPropagation(); });
        }
        actions.appendChild(dlBtn);
    }

    if (!isFree) {
        var hasMultiLicense = false;
        if (p.license_categories && p.license_categories[0]) {
            var lkeys = Object.keys(p.license_categories[0]);
            hasMultiLicense = lkeys.length > 1;
        }
        var cartBtn = document.createElement('button');
        cartBtn.className = 'product-btn product-btn-cart';
        cartBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' + (hasMultiLicense ? ' Select' : ' Add to Cart');
        if (hasMultiLicense) {
            cartBtn.title = 'Select a license first';
            cartBtn.addEventListener('click', function(e) { e.stopPropagation(); openProductModal(p); });
        } else {
            cartBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                addToCart(p, null);
            });
        }
        actions.appendChild(cartBtn);
    }

    if (p.discord_url && p.discord_url.trim()) {
        var dcBtn = document.createElement('a');
        dcBtn.className = 'product-btn product-btn-discord';
        dcBtn.href = p.discord_url;
        dcBtn.target = '_blank';
        dcBtn.rel = 'noopener noreferrer';
        dcBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg>';
        dcBtn.addEventListener('click', function(e) { e.stopPropagation(); });
        actions.appendChild(dcBtn);
    }

    card.appendChild(actions);
    card.addEventListener('click', function() { openProductModal(p); });
    return card;
}

var ownedSearchQuery = '';

function isComingSoonProduct(p) {
    var banner = (p.banner || '').toLowerCase().trim();
    return banner.indexOf('soon') >= 0 || banner.indexOf('coming soon') >= 0;
}

function hasAllProductsAccess(user) {
    if (!user) return false;
    if (user.all_products_access === true || user.all_products_access === false) return user.all_products_access;
    var role = String(user.role || '').toLowerCase();
    return role === 'admin' || role === 'unlockall';
}

function ownedProductList() {
    if (!productsData || !productsData.products || !currentUser) return [];
    var available = productsData.products.filter(function(p) { return !isComingSoonProduct(p) && !isGithubProduct(p); });
    if (hasAllProductsAccess(currentUser)) return available;
    var owned = {};
    if (Array.isArray(currentUser.owned_product_ids)) {
        currentUser.owned_product_ids.forEach(function(productId) { owned[String(productId)] = true; });
    } else {
        (currentUser.license_keys || []).forEach(function(entry) {
            if (entry && entry.is_valid && entry.product_id) owned[String(entry.product_id)] = true;
        });
    }
    return available.filter(function(p) { return p.product_id && owned[String(p.product_id)]; });
}

function ownedCategoryOrder() {
    var order = [];
    if (productsData && productsData.categorys && productsData.categorys[0]) {
        var categories = productsData.categorys[0];
        Object.keys(categories).forEach(function(key) { if (order.indexOf(categories[key]) < 0) order.push(categories[key]); });
    }
    return order;
}

function launchOwnedProduct(p, button) {
    if (isGithubProduct(p)) {
        openGithubProductPage(p.github_url);
        return;
    }
    if (!window.RWLLauncher || !RWLLauncher.isLauncher()) {
        showBanner('Open the Rickware - Labs© Launcher to install and start this tool.', 'info');
        return;
    }
    if (!p.product_id) {
        showBanner('This product cannot be started from the launcher.', 'error');
        return;
    }
    if (button) button.disabled = true;
    RWLLauncher.runAction(p.product_id).then(function() {
        if (button) button.disabled = false;
    });
}

function renderOwnedResults(grid) {
    var toolbar = grid.querySelector('.owned-toolbar');
    while (toolbar && toolbar.nextSibling) grid.removeChild(toolbar.nextSibling);
    var list = ownedProductList();
    var query = ownedSearchQuery.trim().toLowerCase();
    if (query) {
        list = list.filter(function(p) {
            return [p.title, p.description, p.full_description, p.category].some(function(value) {
                return value && String(value).toLowerCase().indexOf(query) >= 0;
            });
        });
    }
    var countEl = grid.querySelector('.owned-count');
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' product' : ' products');
    if (!list.length) {
        var empty = document.createElement('div');
        empty.className = 'owned-empty';
        empty.textContent = query ? 'No owned products match your search.' : 'You do not own any products yet. Licenses from purchases, the Lab-Pass and Mystery Chest vouchers appear here.';
        grid.appendChild(empty);
        return;
    }
    var sortVal = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : 'all';
    var groups = {};
    list.forEach(function(p) {
        var key = p.category || 'Other';
        (groups[key] = groups[key] || []).push(p);
    });
    var order = ownedCategoryOrder();
    var keys = Object.keys(groups).sort(function(left, right) {
        var leftIndex = order.indexOf(left);
        var rightIndex = order.indexOf(right);
        if (leftIndex < 0) leftIndex = 999;
        if (rightIndex < 0) rightIndex = 999;
        return leftIndex - rightIndex || left.localeCompare(right);
    });
    keys.forEach(function(key) {
        var items = groups[key].slice();
        if (sortVal === 'price-low' || sortVal === 'price-high') {
            items.sort(function(a, b) {
                var ai = getProductPriceInfo(a), bi = getProductPriceInfo(b);
                var av = ai.type === 'free' ? 0 : (sortVal === 'price-low' ? (ai.min || ai.price || 0) : (ai.max || ai.price || 0));
                var bv = bi.type === 'free' ? 0 : (sortVal === 'price-low' ? (bi.min || bi.price || 0) : (bi.max || bi.price || 0));
                return sortVal === 'price-low' ? av - bv : bv - av;
            });
        }
        var title = document.createElement('div');
        title.className = 'owned-group-title';
        title.innerHTML = '<b translate="no">' + escHtml(key) + '</b><span>(' + items.length + ')</span>';
        grid.appendChild(title);
        items.forEach(function(p) { grid.appendChild(buildProductCard(p, false, 'owned')); });
    });
    applyShinyTextToEls();
    populateViewCounts(grid);
}

function renderOwnedProducts() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (searchActiveQuery) ownedSearchQuery = searchActiveQuery.slice(0, 100);
    grid.innerHTML = '';
    var toolbar = document.createElement('div');
    toolbar.className = 'owned-toolbar';
    toolbar.innerHTML = '<label class="owned-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><input type="text" id="ownedSearchInput" placeholder="Search your products" autocomplete="off"></label>' +
        '<div><span class="owned-count"></span>' + (hasAllProductsAccess(currentUser) ? '<span class="owned-access-badge" title="Your account can use every product">All Products Unlocked</span>' : '') + '</div>';
    grid.appendChild(toolbar);
    var input = toolbar.querySelector('#ownedSearchInput');
    input.value = ownedSearchQuery;
    input.addEventListener('input', function() {
        ownedSearchQuery = input.value.slice(0, 100);
        renderOwnedResults(grid);
    });
    renderOwnedResults(grid);
    renderPagination(0, 0);
}

function renderProducts(category) {
    var grid = document.getElementById('productsGrid');
    if (!grid || !productsData || !productsData.products) return;
    if (category === 'owned') {
        renderOwnedProducts();
        return;
    }

    var isComingSoon = function(p) {
        var b = (p.banner || '').toLowerCase().trim();
        return b.indexOf('soon') >= 0 || b.indexOf('coming soon') >= 0;
    };

    var list = productsData.products.slice();
    if (category === 'coming-soon') {
        list = list.filter(function(p) { return isComingSoon(p); });
    } else {
        list = list.filter(function(p) { return !isComingSoon(p); });
        if (category === 'free' || category === 'Free Tools') {
            list = list.filter(function(p) { return isFreeProduct(p) && p.file_product !== false; });
        } else if (category !== 'all') {
            list = list.filter(function(p) { return p.category === category && p.file_product !== false; });
        }
    }

    if (searchActiveQuery && searchActiveQuery.trim()) {
        var q = searchActiveQuery.toLowerCase();
        list = list.filter(function(p) {
            if (p.title && p.title.toLowerCase().indexOf(q) >= 0) return true;
            if (p.description && p.description.toLowerCase().indexOf(q) >= 0) return true;
            if (p.full_description && p.full_description.toLowerCase().indexOf(q) >= 0) return true;
            if (p.category && p.category.toLowerCase().indexOf(q) >= 0) return true;
            return false;
        });
    }

    var sortVal = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : 'all';

    if (category !== 'coming-soon' && sortVal !== 'all') {
        list.sort(function(a, b) {
            if (sortVal === 'price-low') {
                var ai = getProductPriceInfo(a), bi = getProductPriceInfo(b);
                var av = ai.type === 'free' ? 0 : (ai.min || ai.price || 0);
                var bv = bi.type === 'free' ? 0 : (bi.min || bi.price || 0);
                return av - bv;
            }
            if (sortVal === 'price-high') {
                var ai2 = getProductPriceInfo(a), bi2 = getProductPriceInfo(b);
                var av2 = ai2.type === 'free' ? 0 : (ai2.max || ai2.price || 0);
                var bv2 = bi2.type === 'free' ? 0 : (bi2.max || bi2.price || 0);
                return bv2 - av2;
            }
            var getBannerRank = function(p) {
                var b = (p.banner || '').toLowerCase();
                if (b.indexOf('most popular') >= 0 || b.indexOf('most-popular') >= 0) return 0;
                if (b.indexOf('popular') >= 0) return 1;
                if (b.indexOf('best seller') >= 0 || b.indexOf('bestseller') >= 0) return 2;
                if (b.indexOf('new release') >= 0 || b.indexOf('new') >= 0) return 3;
                return 4;
            };
            var rA = getBannerRank(a), rB = getBannerRank(b);
            if (rA !== rB) return rA - rB;
            return a.id - b.id;
        });
    }

    var perPageSel = document.getElementById('perPageSelect');
    var perPage = perPageSel ? parseInt(perPageSel.value) || 12 : 12;
    var totalItems = list.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * perPage;
    var pageList = list.slice(start, start + perPage);

    grid.innerHTML = '';
    if (list.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-tertiary);padding:30px;">No products found.</p>';
        renderPagination(0, 0);
        return;
    }
    var showCategory = (category === 'all' && !searchActiveQuery);
    pageList.forEach(function(p) {
        grid.appendChild(buildProductCard(p, showCategory));
    });
    renderPagination(totalPages, currentPage);
    applyShinyTextToEls();
    populateViewCounts(grid);
}

function renderPagination(totalPages, page) {
    var bar = document.getElementById('paginationBar');
    if (!bar) return;
    if (totalPages <= 1) { bar.innerHTML = ''; return; }
    var html = '';
    html += '<button class="pagination-btn"' + (page <= 1 ? ' disabled' : '') + ' onclick="goToPage(' + (page-1) + ')">&#8249;</button>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    if (start > 1) { html += '<button class="pagination-btn" onclick="goToPage(1)">1</button>'; if (start > 2) html += '<span style="color:var(--text-tertiary);padding:0 4px">…</span>'; }
    for (var i = start; i <= end; i++) {
        html += '<button class="pagination-btn' + (i === page ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    if (end < totalPages) { if (end < totalPages - 1) html += '<span style="color:var(--text-tertiary);padding:0 4px">…</span>'; html += '<button class="pagination-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>'; }
    html += '<button class="pagination-btn"' + (page >= totalPages ? ' disabled' : '') + ' onclick="goToPage(' + (page+1) + ')">&#8250;</button>';
    bar.innerHTML = html;
}

function goToPage(n) {
    currentPage = n;
    renderProducts(currentCategory);
    var grid = document.getElementById('productsGrid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function singleLicenseKey(p) {
    if (p.price !== null && p.price !== undefined && p.price !== '') return null;
    var cats = p.license_categories && p.license_categories[0] ? p.license_categories[0] : {};
    var keys = Object.keys(cats);
    return keys.length === 1 ? keys[0] : null;
}

function addToCart(p, licenseKey) {
    if (!licenseKey) licenseKey = singleLicenseKey(p);
    var uid = p.category + '_' + p.id + (licenseKey ? '_' + licenseKey : '');
    var existing = cart.find(function(c) { return c._uid === uid; });
    if (existing) {
        existing.qty = (existing.qty || 1) + 1;
    } else {
        var prices = p.license_categorie_prices && p.license_categorie_prices[0] ? p.license_categorie_prices[0] : {};
        var priceVal = licenseKey ? prices[licenseKey] : (p.price || null);
        cart.push({
            _uid: uid,
            name: p.title + (licenseKey ? ' — ' + licenseKey.replace(/_/g, ' ') : ''),
            price: priceVal,
            qty: 1,
            product: p,
            licenseKey: licenseKey
        });
    }
    updateCartBadge();
}

var selectedLicenseKey = null;

function openProductModal(p, options) {
    var infoOnly = !!(options && options.infoOnly);
    selectedLicenseKey = null;
    window._rwlActiveProduct = p;
    RWL.trackEvent('browse_tools', String(p.product_id || p.id || '').slice(0, 40));
    if (isGithubProduct(p)) trackFx('github', { id: normalizeGithubUrl(p.github_url) });
    else trackFx('product', { id: String(p.product_id || p.id || '') });
    var overlay = document.getElementById('productModalOverlay');
    var inner = document.getElementById('productModalInner');
    if (!overlay || !inner) return;

    var images = [getProductImageUrl(p.preview_image_url)];
    for (var i = 1; i <= 8; i++) {
        var u = p['image_url_' + i];
        if (u && u.trim()) images.push(getProductImageUrl(u));
    }
    images = images.filter(function(x){ return x && x.trim() && !x.trim().endsWith('/'); });

    var currentImg = 0;

    var isFree = isFreeProduct(p);
    var licCats = p.license_categories && p.license_categories[0] ? p.license_categories[0] : {};
    var licKeys = Object.keys(licCats).filter(function(k) { return k !== 'free'; });
    var licPrices = p.license_categorie_prices && p.license_categorie_prices[0] ? p.license_categorie_prices[0] : {};
    var hasMultiLicense = licKeys.length > 1;
    var hasCoupon = p.coupon_codes === true;

    var inWL = isInWishlist(p);

    var html = '';

    if (images.length > 0) {
        html += '<div class="modal-image-gallery" id="modalGallery" style="aspect-ratio:16/7;background:#111;">';
        images.forEach(function(src, idx) {
            html += '<img class="modal-gallery-img' + (idx === 0 ? ' active' : '') + '" src="' + src + '" alt="Image ' + (idx+1) + '" style="object-fit:contain;">';
        });
        if (p.banner && p.banner.trim()) {
            html += '<div class="modal-gallery-banner-label" translate="no">' + escHtml(p.banner) + '</div>';
        }
        if (images.length > 1) {
            html += '<button class="modal-gallery-nav modal-gallery-prev" id="galleryPrev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>';
            html += '<button class="modal-gallery-nav modal-gallery-next" id="galleryNext"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>';
            html += '<div class="modal-gallery-counter" id="galleryCounter">1 / ' + images.length + '</div>';
        }
        html += '</div>';
    }

    html += '<div class="modal-header">';
    html += '<div class="modal-title" translate="no"><span class="shiny-text-js" style="background-image:linear-gradient(120deg,#c97eff 35%,#ffffff 50%,#c97eff 65%);">' + escHtml(p.title) + '</span></div>';
    html += '<div class="modal-badges">';
    if (p.version) html += '<span class="modal-version-badge" translate="no">' + escHtml(p.version) + '</span>';
    if (p.category) html += '<span class="modal-category-badge" translate="no">' + escHtml(p.category) + '</span>';
    html += '</div></div>';

    if (infoOnly) {
        html += '<div class="modal-info-note"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg><span>You own this product. Launch it with the Rickware - Labs© Launcher.</span></div>';
    }

    var descText = (p.full_description && p.full_description.trim()) ? p.full_description : (p.description || '');
    if (descText) {
        html += '<div class="modal-description" translate="no">' + formatDescription(descText) + '</div>';
    }

    html += '<div class="modal-toggles">';
    html += '<div class="modal-toggles-group">';
    if (p.auto_setup) {
        var setupChecked = p.enabled_setup === true;
        html += '<label class="modal-toggle-label"><input type="checkbox" id="modalAutoSetup"' + (setupChecked ? ' checked' : '') + '> Auto Setup</label>';
    }
    if (p.auto_update) {
        var updateChecked = p.enabled_update === true;
        html += '<label class="modal-toggle-label"><input type="checkbox" id="modalAutoUpdate"' + (updateChecked ? ' checked' : '') + '> Auto Update</label>';
    }
    html += '</div>';
    html += buildProductStatsHtml(p, 15);
    html += '</div>';

    if (!infoOnly && !isFree && hasMultiLicense) {
        html += '<div class="modal-section-title">Select License</div>';
        html += '<div class="modal-license-grid" id="modalLicenseGrid">';
        licKeys.forEach(function(k) {
            var label = licCats[k] || k;
            var price = licPrices[k];
            var origKey = k + '_original';
            var orig = licPrices[origKey];
            var isTrialKey = k === 'one_time_trial';
            var priceNum = parseFloat(String(price).replace(',','.'));
            html += '<div class="modal-license-option" data-key="' + k + '">';
            if (isTrialKey && (price === undefined || price === null || price === '' || isNaN(priceNum))) {
                html += '<div class="modal-license-trial-note">Limited to 5 Minutes</div>';
                html += '<div class="modal-license-name">' + escHtml(label) + '</div>';
                html += '<div><span class="modal-license-trial-free">(Free)</span></div>';
            } else {
                html += '<div class="modal-license-name">' + escHtml(label) + '</div>';
                html += '<div><span class="modal-license-price">' + formatUSD(priceNum) + '</span>';
                if (orig) html += '<span class="modal-license-original">' + formatUSD(parseFloat(String(orig).replace(',','.'))) + '</span>';
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';
    } else if (!infoOnly && !isFree && licKeys.length === 1) {
        selectedLicenseKey = licKeys[0];
    }

    if (!infoOnly && hasCoupon && !isFree) {
        html += '<div class="modal-section-title">Coupon Code</div>';
        html += '<div class="modal-coupon-row"><input class="modal-coupon-input" id="modalCouponInput" type="text" placeholder="Enter coupon code..."><button class="modal-coupon-btn" id="modalCouponApply">Apply</button></div>';
    }

    html += '<div class="modal-actions" id="modalActions">';
    if (infoOnly) {
        if (isGithubProduct(p)) {
            var ownedGithubUrl = p.github_url && p.github_url.trim() ? p.github_url : '#';
            html += '<a class="modal-btn modal-btn-download" id="modalOwnedGithubBtn" title="Open the GitHub repository in a new tab" href="' + escHtml(ownedGithubUrl) + '" target="_blank" rel="noopener noreferrer">' + buildGithubIconSvg(15) + ' Launch</a>';
        } else {
            html += '<button class="modal-btn modal-btn-download" id="modalDlBtn" title="Install or start this tool in the Rickware - Labs© Launcher"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg> Launch</button>';
        }
    } else if (isFree) {
        if (isGithubProduct(p)) {
            var ghUrl2 = p.github_url && p.github_url.trim() ? p.github_url : '#';
            html += '<a class="modal-btn modal-btn-download" id="modalDlBtn" title="Open the GitHub repository in a new tab" href="' + escHtml(ghUrl2) + '" target="_blank" rel="noopener noreferrer">' + buildGithubIconSvg(15) + ' Download via GitHub</a>';
        } else {
            html += '<button class="modal-btn modal-btn-download" id="modalDlBtn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Free</button>';
        }
    } else {
        html += '<button class="modal-btn modal-btn-buy" id="modalBuyBtn">Buy Now</button>';
        html += '<button class="modal-btn modal-btn-cart" id="modalCartBtn"' + (hasMultiLicense ? ' disabled' : '') + '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart</button>';
    }
    if (!infoOnly) html += '<button class="modal-btn modal-btn-wishlist' + (inWL ? ' active' : '') + '" id="modalWishBtn" title="Wishlist"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + (inWL ? '#c97eff' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></button>';
    if (p.discord_url && p.discord_url.trim()) {
        html += '<a class="modal-btn modal-btn-discord" href="' + p.discord_url + '" target="_blank" rel="noopener noreferrer"><svg width="14" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg></a>';
    }
    if (p.github_url && p.github_url.trim()) {
        html += '<a class="modal-btn modal-btn-github" href="' + p.github_url + '" target="_blank" rel="noopener noreferrer" style="background:#24292e;color:#fff;flex:0 0 auto;min-width:unset;padding:12px 14px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg></a>';
    }
    if (p.website_url && p.website_url.trim()) {
        html += '<a class="modal-btn modal-btn-website" href="' + p.website_url + '" target="_blank" rel="noopener noreferrer" style="background:rgba(155,0,204,0.14);color:#c97eff;border:1px solid rgba(155,0,204,0.45);flex:0 0 auto;min-width:unset;padding:12px 14px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></a>';
    }
    html += '</div>';

    if (p.owner_name) {
        html += '<div class="modal-owner-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> by ' + escHtml(p.owner_name) + ' &nbsp; Stock: ' + escHtml(p.Stock || '∞') + '</div>';
    }

    var metaItems = [];
    var publishedKey = p['published:'] || p['published'] || '';
    if (publishedKey && String(publishedKey).trim()) metaItems.push('<div class="modal-meta-item">Published: <span>' + escHtml(String(publishedKey).trim()) + '</span></div>');
    if (p.last_update && String(p.last_update).trim()) metaItems.push('<div class="modal-meta-item">Last Update: <span>' + escHtml(String(p.last_update).trim()) + '</span></div>');
    if (metaItems.length > 0) {
        html += '<div class="modal-meta-row">' + metaItems.join('') + '</div>';
    }

    var changeLogText = p.change_log || '';
    if (changeLogText && String(changeLogText).trim()) {
        html += '<div class="modal-changelog-section">';
        html += '<button class="modal-changelog-toggle" id="modalChangelogToggle"><span>Changelog</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>';
        html += '<div class="modal-changelog-content" translate="no" id="modalChangelogContent">' + escHtml(String(changeLogText).replace(/\\n/g, '\n')) + '</div>';
        html += '</div>';
    }

    if (p.github_url && p.github_url.trim()) {
        var ghRepoMatch = p.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
        if (ghRepoMatch) {
            var ghRepo = ghRepoMatch[1].replace(/\.git$/, '');
            html += '<div class="modal-github-dropdown" id="modalGithubDropdown">';
            html += '<button class="modal-github-dropdown-toggle" id="modalGithubDropdownToggle">';
            html += '<span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg> GitHub Repository Info</span>';
            html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
            html += '</button>';
            html += '<div class="modal-github-dropdown-content" id="modalGithubDropdownContent" data-repo="' + escHtml(ghRepo) + '">';
            html += '<div id="githubReadmeSection"><div class="github-repo-section-title">README</div><div class="github-readme-content" id="githubReadmeContent">Loading...</div></div>';
            html += '<div id="githubContributorsSection"><div class="github-repo-section-title">Contributors</div><div class="github-contributors-list" id="githubContributorsList">Loading...</div></div>';
            html += '<div id="githubLanguagesSection"><div class="github-repo-section-title">Languages</div><div class="github-languages-list" id="githubLanguagesList">Loading...</div></div>';
            html += '</div>';
            html += '</div>';
        }
    }

    inner.innerHTML = html;
    populateViewCounts(inner);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (p.full_description && p.full_description.trim()) {
        var descContainer = inner.querySelector('.modal-description');
        if (descContainer) {
            var plainText = (p.full_description || '').replace(/<[^>]+>/g, '').trim();
            startTextTypeAnimation(descContainer, plainText);
        }
    }

    applyShinyTextToEls();

    var changelogToggle = inner.querySelector('#modalChangelogToggle');
    var changelogContent = inner.querySelector('#modalChangelogContent');
    if (changelogToggle && changelogContent) {
        changelogToggle.addEventListener('click', function() {
            var isOpen = changelogContent.classList.contains('open');
            changelogContent.classList.toggle('open', !isOpen);
            changelogToggle.classList.toggle('open', !isOpen);
        });
    }

    if (images.length > 1) {
        var prevBtn = document.getElementById('galleryPrev');
        var nextBtn = document.getElementById('galleryNext');
        var counter = document.getElementById('galleryCounter');
        var imgs = inner.querySelectorAll('.modal-gallery-img');

        function showImg(idx) {
            imgs.forEach(function(im) { im.classList.remove('active'); });
            imgs[idx].classList.add('active');
            if (counter) counter.textContent = (idx+1) + ' / ' + images.length;
            currentImg = idx;
        }

        if (prevBtn) prevBtn.addEventListener('click', function() { showImg((currentImg - 1 + images.length) % images.length); });
        if (nextBtn) nextBtn.addEventListener('click', function() { showImg((currentImg + 1) % images.length); });
    }

    if (hasMultiLicense) {
        var licGrid = inner.querySelector('#modalLicenseGrid');
        if (licGrid) {
            licGrid.querySelectorAll('.modal-license-option').forEach(function(opt) {
                opt.addEventListener('click', function() {
                    licGrid.querySelectorAll('.modal-license-option').forEach(function(o) { o.classList.remove('selected'); });
                    opt.classList.add('selected');
                    selectedLicenseKey = opt.getAttribute('data-key');
                    var cartBtn2 = inner.querySelector('#modalCartBtn');
                    if (cartBtn2) {
                        cartBtn2.disabled = false;
                        if (selectedLicenseKey === 'one_time_trial') {
                            cartBtn2.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg> Start One Time Trial Now';
                        } else {
                            cartBtn2.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart';
                        }
                    }
                });
            });
        }
    }

    var modalCartBtn = inner.querySelector('#modalCartBtn');
    if (modalCartBtn) {
        modalCartBtn.addEventListener('click', function() {
            if (!isFree) {
                if (hasMultiLicense && !selectedLicenseKey) { showBanner('Please select a license first.', 'error'); return; }
                addToCart(p, selectedLicenseKey);
                closeProductModal();
            }
        });
    }

    var modalBuyBtn = inner.querySelector('#modalBuyBtn');
    if (modalBuyBtn) {
        modalBuyBtn.addEventListener('click', function() {
            if (hasMultiLicense && !selectedLicenseKey) { showBanner('Please select a license first.', 'error'); return; }
            addToCart(p, selectedLicenseKey);
            showBanner('Redirecting to checkout...', 'info');
        });
    }

    var modalWishBtn = inner.querySelector('#modalWishBtn');
    if (modalWishBtn) {
        modalWishBtn.addEventListener('click', function() {
            toggleWishlistProduct(p);
            var inWL2 = isInWishlist(p);
            modalWishBtn.classList.toggle('active', inWL2);
            modalWishBtn.querySelector('svg').setAttribute('fill', inWL2 ? '#c97eff' : 'none');
        });
    }

    var couponApply = inner.querySelector('#modalCouponApply');
    if (couponApply) {
        couponApply.addEventListener('click', function() {
            var val = inner.querySelector('#modalCouponInput').value.trim();
            if (val) showBanner('Coupon "' + val + '" applied (demo).', 'success');
        });
    }

    var githubToggle = inner.querySelector('#modalGithubDropdownToggle');
    var githubContent = inner.querySelector('#modalGithubDropdownContent');
    if (githubToggle && githubContent) {
        var githubLoaded = false;
        githubToggle.addEventListener('click', function() {
            var isOpen = githubContent.classList.contains('open');
            githubContent.classList.toggle('open', !isOpen);
            githubToggle.classList.toggle('open', !isOpen);
            if (!isOpen && !githubLoaded) {
                githubLoaded = true;
                var repo = githubContent.getAttribute('data-repo');
                loadGithubRepoInfo(repo, inner);
            }
        });
    }
}

function closeProductModal() {
    var overlay = document.getElementById('productModalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    selectedLicenseKey = null;
}

var githubLangColors = {
    'JavaScript': '#f1e05a', 'Python': '#3572A5', 'TypeScript': '#2b7489',
    'Java': '#b07219', 'C#': '#178600', 'C++': '#f34b7d', 'C': '#555555',
    'PHP': '#4F5D95', 'Ruby': '#701516', 'Go': '#00ADD8', 'Rust': '#dea584',
    'Swift': '#ffac45', 'Kotlin': '#F18E33', 'HTML': '#e34c26', 'CSS': '#563d7c',
    'Shell': '#89e051', 'PowerShell': '#012456', 'Lua': '#000080', 'R': '#198CE7',
    'Scala': '#c22d40', 'Dart': '#00B4AB', 'Vue': '#2c3e50', 'AutoHotkey': '#6594b9'
};

function loadGithubRepoInfo(repo, container) {
    trackFx('github', { id: String(repo || '') });
    var readmeEl = container.querySelector('#githubReadmeContent');
    var contributorsList = container.querySelector('#githubContributorsList');
    var languagesList = container.querySelector('#githubLanguagesList');

    var cacheReadme = sessionStorage.getItem('gh_readme_' + repo);
    var cacheContributors = sessionStorage.getItem('gh_contributors_' + repo);
    var cacheLanguages = sessionStorage.getItem('gh_languages_' + repo);

    if (cacheReadme !== null) {
        if (readmeEl) readmeEl.textContent = cacheReadme;
    } else {
        fetch('https://api.github.com/repos/' + repo + '/readme', { headers: { Accept: 'application/vnd.github.v3.raw' } })
            .then(function(r) { return r.ok ? r.text() : Promise.reject(); })
            .then(function(text) {
                sessionStorage.setItem('gh_readme_' + repo, text.slice(0, 3000));
                if (readmeEl) readmeEl.textContent = text.slice(0, 3000);
            }).catch(function() { if (readmeEl) readmeEl.textContent = 'No README available.'; });
    }

    if (cacheContributors !== null) {
        renderContributors(JSON.parse(cacheContributors), contributorsList);
    } else {
        fetch('https://api.github.com/repos/' + repo + '/contributors?per_page=10')
            .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function(data) {
                sessionStorage.setItem('gh_contributors_' + repo, JSON.stringify(data.slice(0, 10)));
                renderContributors(data.slice(0, 10), contributorsList);
            }).catch(function() { if (contributorsList) contributorsList.textContent = 'No contributor data available.'; });
    }

    if (cacheLanguages !== null) {
        renderLanguages(JSON.parse(cacheLanguages), languagesList);
    } else {
        fetch('https://api.github.com/repos/' + repo + '/languages')
            .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function(data) {
                sessionStorage.setItem('gh_languages_' + repo, JSON.stringify(data));
                renderLanguages(data, languagesList);
            }).catch(function() { if (languagesList) languagesList.textContent = 'No language data available.'; });
    }
}

function renderContributors(contributors, container) {
    if (!container) return;
    if (!contributors || contributors.length === 0) { container.textContent = 'No contributors found.'; return; }
    container.innerHTML = '';
    contributors.forEach(function(c) {
        var a = document.createElement('a');
        a.className = 'github-contributor-item';
        a.href = c.html_url || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        var img = document.createElement('img');
        img.className = 'github-contributor-avatar';
        img.src = c.avatar_url || '';
        img.alt = c.login || '';
        img.onerror = function() { img.style.display = 'none'; };
        var name = document.createElement('span');
        name.className = 'github-contributor-name';
        name.textContent = c.login || '';
        a.appendChild(img);
        a.appendChild(name);
        container.appendChild(a);
    });
}

function renderLanguages(data, container) {
    if (!container) return;
    var keys = Object.keys(data);
    if (keys.length === 0) { container.textContent = 'No language data available.'; return; }
    var total = keys.reduce(function(s, k) { return s + data[k]; }, 0);
    container.innerHTML = '';
    keys.forEach(function(lang) {
        var pct = ((data[lang] / total) * 100).toFixed(1);
        var color = githubLangColors[lang] || '#8b8b8b';
        var row = document.createElement('div');
        row.className = 'github-language-bar-row';
        row.innerHTML = '<div class="github-language-dot" style="background:' + color + '"></div>' +
            '<span class="github-language-name">' + escHtml(lang) + '</span>' +
            '<div class="github-language-bar-wrap"><div class="github-language-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
            '<span class="github-language-pct">' + pct + '%</span>';
        container.appendChild(row);
    });
}

function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function applyShinyTextToEls() {
    document.querySelectorAll('.shiny-text-js').forEach(function(el) {
        if (el.dataset.shinyDone) return;
        el.dataset.shinyDone = '1';
        el.style.display = 'inline-block';
        el.style.backgroundSize = '200% auto';
        el.style.webkitBackgroundClip = 'text';
        el.style.backgroundClip = 'text';
        el.style.webkitTextFillColor = 'transparent';
        el.style.animation = 'shinyMove 2.5s linear infinite';
    });

}

function startTextTypeAnimation(container, text) {
    if (!container || !text) return;
    container.innerHTML = '<span class="text-type-content"></span><span class="text-type__cursor">_</span>';
    var contentEl = container.querySelector('.text-type-content');
    var cursorEl = container.querySelector('.text-type__cursor');
    var chars = text.split('');
    var idx = 0;
    var intervalId = setInterval(function() {
        if (idx < chars.length) {
            contentEl.textContent += chars[idx];
            idx++;
        } else {
            clearInterval(intervalId);
            setTimeout(function() {
                var delIdx = chars.length;
                var delId = setInterval(function() {
                    if (delIdx > 0) {
                        delIdx--;
                        contentEl.textContent = text.substring(0, delIdx);
                    } else {
                        clearInterval(delId);
                        setTimeout(function() { startTextTypeAnimation(container, text); }, 500);
                    }
                }, 30);
            }, 2500);
        }
    }, 50);
    cursorEl.style.animation = 'cursorBlink 1s ease-in-out infinite';
}

function formatDescription(text) {
    if (!text) return '';
    var lines = String(text).split(/\\n|\n/);
    var html = '';
    lines.forEach(function(line) {
        var trimmed = line;
        if (trimmed.match(/^#.*#\s*$/) || trimmed.match(/^#[^#]/)) {
            var inner = trimmed.replace(/^#+\s*/, '').replace(/\s*#+$/, '');
            inner = applyInlineFormats(inner);
            html += '<div class="fd-highlight">' + inner + '</div>';
        } else if (trimmed.match(/^\*\*/) && !trimmed.match(/^\*\*.*\*\*$/)) {
            var inner2 = trimmed.replace(/^\*\*\s*/, '');
            inner2 = applyInlineFormats(inner2);
            html += '<div class="fd-bold">' + inner2 + '</div>';
        } else if (trimmed.match(/^-\s/)) {
            var inner3 = trimmed.replace(/^-\s+/, '');
            inner3 = applyInlineFormats(inner3);
            html += '<div class="fd-bullet">\u2022 ' + inner3 + '</div>';
        } else if (trimmed.trim() === '') {
            html += '<div class="fd-spacer"></div>';
        } else {
            html += '<div>' + applyInlineFormats(trimmed) + '</div>';
        }
    });
    return html;
}

function applyInlineFormats(text) {
    var t = escHtml(text);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="fd-link">$1</a>');
    return t;
}

function setupDropdowns() {
    var closeBtn = document.getElementById('productModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeProductModal);
    var modalOverlay = document.getElementById('productModalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) closeProductModal();
        });
    }

    var wishlistLicOverlay = document.getElementById('wishlistLicenseModalOverlay');
    var wishlistLicCloseBtn = document.getElementById('wishlistLicenseModalClose');
    if (wishlistLicCloseBtn) {
        wishlistLicCloseBtn.addEventListener('click', function() {
            if (wishlistLicOverlay) {
                wishlistLicOverlay.classList.remove('open');
                wishlistLicOverlay.classList.remove('active');
                wishlistLicOverlay.style.display = 'none';
            }
            document.body.style.overflow = '';
        });
    }
    if (wishlistLicOverlay) {
        wishlistLicOverlay.addEventListener('click', function(e) {
            if (e.target === wishlistLicOverlay) {
                wishlistLicOverlay.classList.remove('open');
                wishlistLicOverlay.classList.remove('active');
                wishlistLicOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    var wishlistWrapper = document.getElementById('wishlistWrapper');
    var cartWrapper = document.getElementById('cartWrapper');
    var wishlistDropdown = document.getElementById('wishlistDropdown');
    var cartDropdown = document.getElementById('cartDropdown');
    var wishlistBtn = document.getElementById('wishlistBtn');
    var cartBtn = document.getElementById('cartBtn');

    function closeAll() {
        if (wishlistDropdown) wishlistDropdown.classList.remove('open');
        if (cartDropdown) cartDropdown.classList.remove('open');
    }

    if (wishlistBtn && wishlistDropdown) {
        wishlistBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = wishlistDropdown.classList.contains('open');
            closeAll();
            if (!isOpen) {
                renderWishlistDropdown();
                wishlistDropdown.classList.add('open');
            }
        });
    }

    if (cartBtn && cartDropdown) {
        cartBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = cartDropdown.classList.contains('open');
            closeAll();
            if (!isOpen) {
                renderCartDropdown();
                cartDropdown.classList.add('open');
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (wishlistWrapper && !wishlistWrapper.contains(e.target)) {
            if (wishlistDropdown) wishlistDropdown.classList.remove('open');
        }
        if (cartWrapper && !cartWrapper.contains(e.target)) {
            if (cartDropdown) cartDropdown.classList.remove('open');
        }
    });
}

function renderWishlistDropdown() {
    var container = document.getElementById('wishlistItems');
    if (!container) return;
    if (!wishlist || wishlist.length === 0) {
        container.innerHTML = '<div class="dropdown-empty">Your wishlist is empty.</div>';
        return;
    }
    container.innerHTML = '';
    wishlist.forEach(function(item, idx) {
        var row = document.createElement('div');
        row.className = 'dropdown-item';
        row.innerHTML = '<span class="dropdown-item-name">' + escHtml(item.name || item.title || 'Item') + '</span>' +
            '<button onclick="wishlistPickerMoveToCart(' + idx + ')" class="dropdown-action-btn" title="Move to Cart"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></button>' +
            '<button onclick="wishlistOrder(' + idx + ')" class="dropdown-action-btn dropdown-order-btn" title="Order Now"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></button>' +
            '<button onclick="wishlistRemove(' + idx + ')" class="dropdown-trash-btn" title="Remove"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>';
        container.appendChild(row);
    });
}

function renderCartDropdown() {
    var container = document.getElementById('cartItems');
    var footer = document.getElementById('cartFooter');
    if (!container) return;
    if (!cart || cart.length === 0) {
        container.innerHTML = '<div class="dropdown-empty">Your cart is empty.</div>';
        if (footer) footer.style.display = 'none';
        return;
    }
    if (footer) footer.style.display = '';
    container.innerHTML = '';
    cart.forEach(function(item, idx) {
        var row = document.createElement('div');
        row.className = 'dropdown-item';
        row.style.flexDirection = 'column';
        row.style.alignItems = 'stretch';
        row.style.gap = '4px';
        row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<span class="dropdown-item-name">' + escHtml(item.name) + '</span>' +
            '<span class="dropdown-item-price">' + (item.price ? formatUSD(parseFloat(String(item.price).replace(',','.'))) : 'Free') + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;margin-top:2px">' +
            '<button onclick="cartQty(' + idx + ',-1);event.stopPropagation();" style="background:var(--bg-hover);border:1px solid var(--border-color);color:#fff;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">−</button>' +
            '<span style="font-size:12px;color:var(--text-secondary);min-width:20px;text-align:center">' + (item.qty||1) + '</span>' +
            '<button onclick="cartQty(' + idx + ',1);event.stopPropagation();" style="background:var(--bg-hover);border:1px solid var(--border-color);color:#fff;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">+</button>' +
            '<button onclick="cartRemove(' + idx + ');event.stopPropagation();" class="dropdown-trash-btn" title="Remove"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>' +
            '</div>';
        container.appendChild(row);
    });
}

function cartQty(idx, delta) {
    if (!cart[idx]) return;
    var newQty = (cart[idx].qty || 1) + delta;
    if (newQty <= 0) {
        cart.splice(idx, 1);
    } else {
        cart[idx].qty = newQty;
    }
    updateCartBadge();
    var cartDropdown = document.getElementById('cartDropdown');
    var wasOpen = cartDropdown && cartDropdown.classList.contains('open');
    renderCartDropdown();
    if (wasOpen && cartDropdown) cartDropdown.classList.add('open');
}

function cartRemove(idx) {
    cart.splice(idx, 1);
    updateCartBadge();
    var cartDropdown = document.getElementById('cartDropdown');
    var wasOpen = cartDropdown && cartDropdown.classList.contains('open');
    renderCartDropdown();
    if (wasOpen && cartDropdown) cartDropdown.classList.add('open');
}

function wishlistRemove(idx) {
    var removedItem = wishlist[idx];
    wishlist.splice(idx, 1);
    var badge = document.getElementById('wishlistBadge');
    if (badge) badge.textContent = wishlist.length;
    renderWishlistDropdown();
    if (removedItem) {
        syncWishlistButtonState(removedItem, false);
    }
}

function syncWishlistButtonState(product, inWishlist) {
    document.querySelectorAll('.product-btn-wishlist').forEach(function(btn) {
        var card = btn.closest('[data-product-id]');
        var matchById = card && product.id && card.getAttribute('data-product-id') == String(product.id);
        var matchByTitle = !matchById && card && product.title && card.getAttribute('data-product-id') === (product.title || '');
        if (matchById || matchByTitle) {
            btn.classList.toggle('active', inWishlist);
            var svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', inWishlist ? '#c97eff' : 'none');
        }
    });
    if (!inWishlist) {
        var modalInner = document.getElementById('productModalInner');
        if (modalInner) {
            var wishBtn = modalInner.querySelector('.product-btn-wishlist, .modal-wishlist-btn');
            if (wishBtn) {
                wishBtn.classList.remove('active');
                var svg = wishBtn.querySelector('svg');
                if (svg) svg.setAttribute('fill', 'none');
            }
        }
    }
}

function wishlistMoveToCart(idx) {
    var item = wishlist[idx];
    if (!item) return;
    var uid = item._uid;
    var existing = cart.find(function(c) { return c._uid === uid; });
    if (existing) {
        existing.qty = (existing.qty || 1) + 1;
    } else if (!item.licenseKey && item.title && singleLicenseKey(item)) {
        addToCart(item);
    } else {
        cart.push(Object.assign({ qty: 1 }, item));
    }
    wishlist.splice(idx, 1);
    var wb = document.getElementById('wishlistBadge');
    if (wb) wb.textContent = wishlist.length;
    updateCartBadge();
    renderWishlistDropdown();
    renderCartDropdown();
}

function wishlistPickerMoveToCart(idx) {
    var item = wishlist[idx];
    if (!item) return;
    openWishlistLicensePicker(item, idx, 'move');
}

function wishlistOrder(idx) {
    var item = wishlist[idx];
    if (!item) return;
    openWishlistLicensePicker(item, idx, 'checkout');
}

function buildWishlistCheckoutHtml(tempCartItems) {
    var total = tempCartItems.reduce(function(sum, item) {
        var p = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
        return sum + p * (item.qty || 1);
    }, 0);
    var payments = [
        { name: 'Bitcoin (BTC)', icon: '\u20bf', available: true, coin: 'btc' },
        { name: 'Ethereum (ETH)', icon: '\u039e', available: true, coin: 'eth' },
        { name: 'Solana (SOL)', icon: '\u25ce', available: true, coin: 'sol' },
        { name: 'BNB (BNB)', icon: '\u2b21', available: true, coin: 'bnb' },
        { name: 'TRON (TRX)', icon: '\u26a1', available: true, coin: 'trx' },
        { name: 'Litecoin (LTC)', icon: '\u0141', available: true, coin: 'ltc' },
        { name: 'Bitcoin Cash (BCH)', icon: '\u20bf', available: true, coin: 'bch' },
        { name: 'Dogecoin (DOGE)', icon: '\u00d0', available: true, coin: 'doge' },
        { name: 'Amazon Voucher', icon: '\ud83d\udce6', available: true, coin: null },
        { name: 'Paysafecard', icon: '\ud83c\udfae', available: true, coin: null },
        { name: 'Lab Coins (LC)', icon: '\ud83e\ude99', available: true, lc: true, coin: null },
        { name: 'PayPal', icon: '\ud83c\udd7f', available: false, coin: null },
        { name: 'Credit Card', icon: '\ud83d\udcb3', available: false, coin: null },
        { name: 'Bank Transfer', icon: '\ud83c\udfe6', available: false, coin: null },
        { name: 'Klarna', icon: '\ud83d\udecd', available: false, coin: null }
    ];
    var lcRate = currentLcUsdRate();
    var html = '<div class="coin-checkout-modal">';
    html += '<div class="coin-checkout-header"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><h2>Checkout</h2></div>';
    html += '<div class="coin-checkout-summary glass-card">';
    tempCartItems.forEach(function(item) {
        var p = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
        html += '<div class="coin-checkout-row"><span>' + escHtml(item.name) + (item.qty > 1 ? ' \xd7' + item.qty : '') + '</span><strong>' + (p > 0 ? formatUSD(p * (item.qty || 1)) : 'Free') + '</strong></div>';
    });
    html += '<div class="coin-checkout-divider"></div>';
    html += '<div class="coin-checkout-row coin-price-row"><span>Total</span><strong>' + formatUSD(total) + '</strong></div>';
    html += '</div>';
    html += '<div class="checkout-coupon-row"><input type="text" placeholder="Coupon code (optional)" class="checkout-coupon-input" id="wishlistCheckoutCoupon"><button class="checkout-coupon-apply" onclick="applyWishlistCheckoutCoupon()">Apply</button></div>';
    html += '<div class="coin-checkout-payment"><div class="coin-checkout-payment-label">Select Payment Method</div><div class="coin-payment-methods" id="wishlistPaymentMethods">';
    payments.forEach(function(pm) {
        if (pm.available) {
            var label = pm.icon + ' ' + pm.name;
            var coinAttr = pm.coin ? ' data-coin="' + pm.coin + '"' : ' data-coin=""';
            if (pm.lc) {
                var lcCost = Math.ceil(total / lcRate);
                var userLc = labCoinsBalance || 0;
                var canAfford = userLc >= lcCost;
                label += ' <span style="font-size:10px;opacity:0.75;">(' + lcCost + ' LC' + (canAfford ? '' : ' \u2014 insufficient') + ')</span>';
                html += '<button class="coin-payment-btn' + (!canAfford ? ' lc-insufficient' : '') + '"' + coinAttr + ' onclick="selectWishlistCheckoutPayment(this)" ' + (!canAfford ? 'title="You need ' + lcCost + ' LC but have ' + userLc + ' LC"' : '') + '>' + label + '</button>';
            } else {
                html += '<button class="coin-payment-btn"' + coinAttr + ' onclick="selectWishlistCheckoutPayment(this)">' + label + '</button>';
            }
        } else {
            html += '<button class="coin-payment-btn" disabled style="opacity:0.4;cursor:not-allowed;">' + pm.icon + ' ' + pm.name + ' <span style="font-size:9px;">Soon</span></button>';
        }
    });
    html += '</div></div>';
    html += '<div class="coin-checkout-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-right:6px;vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Crypto payments are processed automatically via NowPayments. Manual methods (Amazon, Paysafecard, LC) require a Discord ticket.</div>';
    html += '<button class="coin-checkout-confirm-btn" id="wishlistConfirmOrderBtn" onclick="confirmWishlistCheckout()">Place Order \u2192</button>';
    html += '</div>';
    return html;
}

function applyWishlistCheckoutCoupon() {
    applyCouponInput('wishlistCheckoutCoupon');
}

function selectWishlistCheckoutPayment(btn) {
    var grid = btn.closest('.coin-payment-methods');
    if (grid) grid.querySelectorAll('.coin-payment-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
}

async function confirmWishlistCheckout() {
    var inner = document.getElementById('wishlistLicenseModalInner');
    var selectedBtn = inner ? inner.querySelector('.coin-payment-btn.active') : null;
    var tempCart = window._wishlistTempCart || [];
    if (!selectedBtn) { showBanner('Please select a payment method.', 'error'); return; }
    if (tempCart.length === 0 || !inner) return;
    await runCheckout({
        overlayId: 'wishlistLicenseModalOverlay',
        inner: inner,
        items: tempCart.slice(),
        selectedBtn: selectedBtn,
        couponCode: checkoutCouponValue(document.getElementById('wishlistCheckoutCoupon')),
        onComplete: function() { window._wishlistTempCart = null; }
    });
}

function openWishlistLicensePicker(item, wishlistIdx, mode) {
    var overlay = document.getElementById('wishlistLicenseModalOverlay');
    var inner = document.getElementById('wishlistLicenseModalInner');
    if (!overlay || !inner) {
        if (mode === 'move') {
            wishlistMoveToCart(wishlistIdx);
        } else {
            wishlistMoveToCart(wishlistIdx);
            openCheckoutModal();
        }
        return;
    }
    var licCats = item.license_categories && item.license_categories[0] ? item.license_categories[0] : {};
    var licKeys = Object.keys(licCats).filter(function(k) { return k !== 'free'; });
    var licPrices = item.license_categorie_prices && item.license_categorie_prices[0] ? item.license_categorie_prices[0] : {};
    var html = '<div class="coin-checkout-modal">';
    html += '<div class="coin-checkout-header"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><h2>' + escHtml(item.name || item.title || 'Purchase Options') + '</h2></div>';
    if (licKeys.length > 0) {
        html += '<div class="modal-section-title" style="margin-top:0;margin-bottom:10px;">Select License</div>';
        html += '<div class="modal-license-grid" id="wishlistLicPickerGrid">';
        licKeys.forEach(function(k) {
            var label = licCats[k] || k;
            var price = licPrices[k];
            var priceNum = parseFloat(String(price).replace(',','.'));
            var isTrialKey = k === 'one_time_trial';
            html += '<div class="modal-license-option" data-key="' + k + '">';
            if (isTrialKey && (price === undefined || price === null || price === '' || isNaN(priceNum))) {
                html += '<div class="modal-license-trial-note">Limited to 5 Minutes</div>';
                html += '<div class="modal-license-name">' + escHtml(label) + '</div>';
                html += '<div><span class="modal-license-trial-free">(Free)</span></div>';
            } else {
                html += '<div class="modal-license-name">' + escHtml(label) + '</div>';
                html += '<div><span class="modal-license-price">' + (isNaN(priceNum) ? '' : formatUSD(priceNum)) + '</span></div>';
            }
            html += '</div>';
        });
        html += '</div>';
    }
    html += '<div class="coin-checkout-summary glass-card" style="flex-direction:row;align-items:center;gap:14px;padding:14px 18px;">';
    html += '<label style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">Quantity:</label>';
    html += '<input type="number" id="wishlistLicPickerQty" min="1" value="1" style="width:70px;background:rgba(20,5,35,0.8);border:1px solid rgba(139,0,160,0.4);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;outline:none;">';
    html += '</div>';
    var btnLabel = mode === 'move' ? 'Add to Cart' : 'Continue to Checkout \u2192';
    html += '<button id="wishlistLicPickerContinue" class="coin-checkout-confirm-btn">' + btnLabel + '</button>';
    html += '</div>';
    inner.innerHTML = html;
    overlay.classList.add('open');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    var selectedPicker = null;
    var pickerGrid = inner.querySelector('#wishlistLicPickerGrid');
    if (pickerGrid) {
        pickerGrid.querySelectorAll('.modal-license-option').forEach(function(opt) {
            opt.addEventListener('click', function() {
                pickerGrid.querySelectorAll('.modal-license-option').forEach(function(o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                selectedPicker = opt.getAttribute('data-key');
            });
        });
    }
    var continueBtn = inner.querySelector('#wishlistLicPickerContinue');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (licKeys.length > 0 && !selectedPicker) { showBanner('Please select a license.', 'error'); return; }
            var qty = parseInt(inner.querySelector('#wishlistLicPickerQty').value) || 1;
            var uid = (item.category || '') + '_' + (item.id || '') + (selectedPicker ? '_' + selectedPicker : '');
            var prices = item.license_categorie_prices && item.license_categorie_prices[0] ? item.license_categorie_prices[0] : {};
            var priceVal = selectedPicker ? prices[selectedPicker] : (item.price || null);
            var cartItem = {
                _uid: uid,
                name: (item.name || item.title || 'Item') + (selectedPicker ? ' \u2014 ' + selectedPicker.replace(/_/g, ' ') : ''),
                price: priceVal,
                qty: qty,
                product: item,
                licenseKey: selectedPicker
            };
            if (mode === 'move') {
                var existing = cart.find(function(c) { return c._uid === uid; });
                if (existing) {
                    existing.qty = (existing.qty || 1) + qty;
                } else {
                    cart.push(cartItem);
                }
                wishlist.splice(wishlistIdx, 1);
                var wb = document.getElementById('wishlistBadge');
                if (wb) wb.textContent = wishlist.length;
                updateCartBadge();
                renderWishlistDropdown();
                renderCartDropdown();
                overlay.classList.remove('open');
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                showBanner('Item moved to cart.', 'success');
            } else {
                wishlist.splice(wishlistIdx, 1);
                var wb2 = document.getElementById('wishlistBadge');
                if (wb2) wb2.textContent = wishlist.length;
                renderWishlistDropdown();
                window._wishlistTempCart = [cartItem];
                inner.innerHTML = buildWishlistCheckoutHtml([cartItem]);
            }
        });
    }
}
function toggleStatusChangelog(btn) {
    var body = btn.nextElementSibling;
    if (!body) return;
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!isOpen));
    btn.classList.toggle('open', !isOpen);
}

function currentLcUsdRate() {
    var rate = parseFloat(window._lcUsdRate);
    return rate > 0 ? rate : 0.137;
}

var CRYPTO_PAYMENT_COINS = ['btc', 'eth', 'sol', 'bnb', 'trx', 'ltc', 'bch', 'doge'];
var FAILED_ORDER_STATUSES = ['failed', 'expired', 'cancelled', 'refunded'];
var checkoutStatusTimers = {};

function checkoutPaymentChoice(button) {
    if (!button || button.disabled) return null;
    var coin = button.getAttribute('data-coin') || '';
    if (CRYPTO_PAYMENT_COINS.indexOf(coin) >= 0) return { kind: 'crypto', coin: coin };
    var method = button.getAttribute('data-method') || '';
    if (CRYPTO_PAYMENT_COINS.indexOf(method) >= 0) return { kind: 'crypto', coin: method };
    var text = (button.textContent || '').toLowerCase();
    if (method === 'amazon' || text.indexOf('amazon') >= 0) return { kind: 'manual', method: 'amazon', label: 'Amazon Voucher' };
    if (method === 'psc' || text.indexOf('paysafecard') >= 0) return { kind: 'manual', method: 'paysafecard', label: 'Paysafecard' };
    if (text.indexOf('lab coins') >= 0) return { kind: 'lc' };
    return null;
}

function checkoutCouponValue(input) {
    if (!input) return null;
    var value = (input.dataset.code || input.value || '').trim().toUpperCase();
    return value || null;
}

async function applyCouponInput(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var code = (input.value || '').trim().toUpperCase();
    delete input.dataset.code;
    if (!/^[A-Z0-9_\-]{3,50}$/.test(code)) {
        input.style.borderColor = 'rgba(239,68,68,0.7)';
        showBanner('Please enter a valid coupon code.', 'error');
        return;
    }
    try {
        var info = await RWL.apiRequest('/api/coupons/info?code=' + encodeURIComponent(code));
        input.value = info.code;
        input.dataset.code = info.code;
        input.style.borderColor = 'rgba(76,175,80,0.6)';
        var discountText = info.discount_type === 'percent' ? Number(info.discount_value) + '% off' : formatUSD(Number(info.discount_value)) + ' off';
        var minimumText = info.min_order_amount ? ' on orders from ' + formatUSD(Number(info.min_order_amount)) : '';
        showBanner('Coupon ' + info.code + ' applied: ' + discountText + minimumText + '. The final price is calculated securely at checkout.', 'success');
    } catch (error) {
        input.style.borderColor = 'rgba(239,68,68,0.7)';
        showBanner(error.message || 'Coupon not found or inactive', 'error');
    }
}

function checkoutCartPayload(items) {
    return items.map(function(item) {
        var product = item.product || {};
        var productPayload = product.lc_pack ? { id: String(product.id || ''), lc_pack: true } : { product_id: String(product.product_id || '') };
        return {
            name: String(item.name || '').slice(0, 300),
            qty: Math.max(1, Math.min(parseInt(item.qty, 10) || 1, 10)),
            product: productPayload,
            licenseKey: item.licenseKey || null
        };
    });
}

function closeCheckoutOverlayById(overlayId) {
    var overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.remove('open');
        overlay.classList.remove('active');
        overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
    stopCheckoutStatusPolling(overlayId);
}

function checkoutCloseButtonHtml(overlayId, extraStyle) {
    return '<button class="coin-checkout-confirm-btn" style="background:rgba(99,0,138,0.4);' + (extraStyle || '') + '" onclick="closeCheckoutOverlayById(\'' + overlayId + '\')">Close</button>';
}

function checkoutLoadingHtml(text) {
    return '<div style="text-align:center;padding:40px 20px;"><div style="color:#c97eff;font-size:14px;margin-bottom:12px;">' + escHtml(text) + '</div><div style="width:32px;height:32px;border:3px solid rgba(155,0,204,0.3);border-top-color:#c97eff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div></div>';
}

function checkoutErrorHtml(message, overlayId) {
    return '<div style="text-align:center;padding:40px 20px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom:12px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><p style="color:#ef4444;font-size:14px;">' + escHtml(message) + '</p>' + checkoutCloseButtonHtml(overlayId, 'margin-top:16px;') + '</div>';
}

function checkoutSuccessHtml(title, message, extraHtml) {
    return '<div style="text-align:center;padding:40px 20px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" style="margin-bottom:16px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><h2 style="color:#4caf50;margin-bottom:8px;">' + escHtml(title) + '</h2><p style="color:var(--text-secondary);">' + escHtml(message) + '</p>' + (extraHtml || '') + '</div>';
}

function checkoutStatusLabel(payload) {
    var status = String((payload && payload.status) || 'pending');
    var providerStatus = String((payload && payload.provider_status) || '');
    if (status === 'paid') return 'Paid · Delivered';
    if (status === 'partially_paid') return 'Partially paid · Send the remaining amount';
    if (status === 'underpaid') return 'Underpaid · Please contact support';
    if (FAILED_ORDER_STATUSES.indexOf(status) >= 0) return status.charAt(0).toUpperCase() + status.slice(1);
    if (providerStatus === 'confirming') return 'Payment detected · Confirming';
    if (providerStatus === 'sending' || providerStatus === 'confirmed') return 'Confirmed · Delivering';
    return 'Waiting for payment';
}

function stopCheckoutStatusPolling(overlayId) {
    if (checkoutStatusTimers[overlayId]) {
        clearInterval(checkoutStatusTimers[overlayId]);
        delete checkoutStatusTimers[overlayId];
    }
}

function startCheckoutStatusPolling(overlayId, orderId) {
    stopCheckoutStatusPolling(overlayId);
    var startedAt = Date.now();
    var poll = async function() {
        var overlay = document.getElementById(overlayId);
        var statusEl = document.getElementById('checkoutOrderStatus');
        if (!overlay || overlay.style.display === 'none' || !statusEl || Date.now() - startedAt > 7200000) {
            stopCheckoutStatusPolling(overlayId);
            return;
        }
        try {
            var payload = await RWL.apiRequest('/api/payment/status/' + encodeURIComponent(orderId));
            statusEl.textContent = checkoutStatusLabel(payload);
            if (payload.status === 'paid') {
                statusEl.style.color = '#4caf50';
                stopCheckoutStatusPolling(overlayId);
                showBanner('Payment received! Your order has been delivered.', 'success');
                await checkLoginStatus();
            } else if (FAILED_ORDER_STATUSES.indexOf(payload.status) >= 0) {
                statusEl.style.color = '#ef4444';
                stopCheckoutStatusPolling(overlayId);
            }
        } catch (error) {}
    };
    checkoutStatusTimers[overlayId] = setInterval(poll, 15000);
    setTimeout(poll, 4000);
}

function updateStoredLabCoins(balance) {
    if (balance === undefined || balance === null) return;
    setLabCoinsBalance(balance);
    try {
        var stored = sessionStorage.getItem('rickware_user');
        if (stored) {
            var user = JSON.parse(stored);
            user.user_discord_user_coin_amount = balance;
            user.lab_coins = balance;
            sessionStorage.setItem('rickware_user', JSON.stringify(user));
        }
    } catch (error) {}
}

async function runCheckout(context) {
    var inner = context.inner;
    var choice = checkoutPaymentChoice(context.selectedBtn);
    if (!choice) { showBanner('Please select a payment method.', 'error'); return; }
    if (!context.items || context.items.length === 0) return;
    if (!currentUser || !RWL.getToken()) { showBanner('Please login to complete your purchase.', 'error'); return; }
    var cartPayload = checkoutCartPayload(context.items);
    if (cartPayload.some(function(item) { return !item.product.product_id && !item.product.lc_pack; })) {
        showBanner('A product in your cart is no longer available.', 'error');
        return;
    }
    var couponCode = context.couponCode || null;
    if (choice.kind === 'crypto') {
        inner.innerHTML = checkoutLoadingHtml('Creating payment...');
        try {
            var data = await RWL.apiRequest('/api/payment/create', { method: 'POST', body: { cart_items: cartPayload, coin: choice.coin, coupon_code: couponCode } });
            context.onComplete();
            if (data.status === 'completed') {
                inner.innerHTML = checkoutSuccessHtml('Order Completed!', 'No payment was required. Your order has been delivered.', checkoutCloseButtonHtml(context.overlayId, 'margin-top:16px;'));
                await checkLoginStatus();
                return;
            }
            var expLine = data.expiration_estimate_date ? '<div class="coin-checkout-row"><span>Expires</span><strong>' + escHtml(new Date(data.expiration_estimate_date).toLocaleString()) + '</strong></div>' : '';
            var discountLine = data.discount_amount ? '<div class="coin-checkout-row"><span>Coupon Savings</span><strong>-' + escHtml(formatUSD(Number(data.discount_amount))) + '</strong></div>' : '';
            inner.innerHTML =
                '<div class="coin-checkout-modal">' +
                    '<div class="coin-checkout-header"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><h2>Payment Created</h2></div>' +
                    '<div class="coin-checkout-summary glass-card">' +
                        '<div class="coin-checkout-row"><span>Order ID</span><strong style="font-size:12px;">' + escHtml(data.order_id) + '</strong></div>' +
                        '<div class="coin-checkout-row"><span>Total</span><strong>' + escHtml(formatUSD(Number(data.total_usd || 0))) + '</strong></div>' +
                        discountLine +
                        '<div class="coin-checkout-row"><span>Send Amount</span><strong>' + escHtml(String(data.pay_amount)) + ' ' + escHtml(String(data.pay_currency || choice.coin).toUpperCase()) + '</strong></div>' +
                        '<div class="coin-checkout-row" style="flex-direction:column;align-items:flex-start;gap:6px;"><span>Send To Address</span><strong style="word-break:break-all;font-size:11px;line-height:1.5;color:#c97eff;">' + escHtml(data.pay_address) + '</strong></div>' +
                        expLine +
                        '<div class="coin-checkout-row"><span>Status</span><strong id="checkoutOrderStatus">Waiting for payment</strong></div>' +
                    '</div>' +
                    '<div class="coin-checkout-note">Send exactly the amount shown to the address above. Your order is delivered automatically after the network confirmation. Do not close this window until you have copied the address.</div>' +
                    checkoutCloseButtonHtml(context.overlayId) +
                '</div>';
            showBanner('Payment address created. Send crypto to complete your purchase.', 'success');
            startCheckoutStatusPolling(context.overlayId, data.order_id);
        } catch (error) {
            inner.innerHTML = checkoutErrorHtml(error.message || 'Payment creation failed. Please try again.', context.overlayId);
        }
        return;
    }
    if (choice.kind === 'lc') {
        inner.innerHTML = checkoutLoadingHtml('Processing Lab Coins payment...');
        try {
            var lcData = await RWL.apiRequest('/api/payment/lc', { method: 'POST', body: { cart_items: cartPayload, coupon_code: couponCode } });
            updateStoredLabCoins(lcData.lc_balance);
            context.onComplete();
            inner.innerHTML = checkoutSuccessHtml('Payment Successful!', 'Your purchase was completed with Lab Coins. Your products are now activated.', '<p style="color:#c97eff;margin-top:12px;">' + escHtml(String(lcData.lc_spent)) + ' LC spent · New balance: ' + escHtml(String(lcData.lc_balance)) + ' LC</p>' + checkoutCloseButtonHtml(context.overlayId, 'margin-top:16px;'));
            showBanner('Payment successful! Products activated.', 'success');
            checkLoginStatus();
        } catch (error) {
            inner.innerHTML = checkoutErrorHtml(error.message || 'Lab Coins payment failed.', context.overlayId);
        }
        return;
    }
    inner.innerHTML = checkoutLoadingHtml('Submitting order...');
    try {
        var manualData = await RWL.apiRequest('/api/payment/manual', { method: 'POST', body: { cart_items: cartPayload, method: choice.method, coupon_code: couponCode } });
        context.onComplete();
        var invite = (config && config.discord_invite) ? config.discord_invite : 'https://discord.gg/Wk7d8mJgyN';
        inner.innerHTML = checkoutSuccessHtml(
            'Order Submitted!',
            'Join our Discord and open a ticket with your ' + choice.label + ' and the order ID below. Your order is delivered as soon as the team confirms the payment.',
            '<div class="coin-checkout-summary glass-card" style="margin-top:16px;text-align:left;">' +
                '<div class="coin-checkout-row"><span>Order ID</span><strong style="font-size:12px;">' + escHtml(manualData.order_id) + '</strong></div>' +
                '<div class="coin-checkout-row"><span>Total</span><strong>' + escHtml(formatUSD(Number(manualData.total_usd || 0))) + '</strong></div>' +
            '</div>' +
            '<a href="' + escHtml(invite) + '" target="_blank" rel="noopener noreferrer" class="coin-checkout-confirm-btn" style="display:block;text-decoration:none;margin-top:12px;">Open Discord Ticket →</a>' +
            checkoutCloseButtonHtml(context.overlayId, 'margin-top:10px;')
        );
        showBanner('Order submitted. Open a Discord ticket to complete your payment.', 'success');
    } catch (error) {
        inner.innerHTML = checkoutErrorHtml(error.message || 'Order submission failed. Please try again.', context.overlayId);
    }
}

function canVoteReview(review) {
    return !!currentUser && !!review && review.votable !== false;
}

function reviewVoteBlockedTitle(review) {
    if (review && review.votable === false) return 'Votes are only available for website reviews';
    return 'Login to vote';
}

function reviewSourceBadgeHtml(review) {
    if (review && review.source === 'discord') {
        return '<div class="review-verified" style="color:#8ea1e1;" title="Posted in our Discord server. This review is not linked to a verified purchase.">' +
            '<div class="review-verified-icon" style="border-color:#5865f2;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
            'Unverified Discord Review' +
        '</div>';
    }
    return '<div class="review-verified" title="Written by a customer who owns this product.">' +
        '<div class="review-verified-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>' +
        'Verified Purchase' +
    '</div>';
}

var reviewsLiveTimer = null;
var reviewsLiveSignature = '';

function reviewsSignature(list) {
    return (list || []).map(function(review) { return review.review_id; }).join('|');
}

function startReviewsLiveRefresh() {
    reviewsLiveSignature = reviewsSignature(reviewsApiData);
    if (reviewsLiveTimer) return;
    reviewsLiveTimer = setInterval(async function() {
        var section = document.getElementById('reviewsPageSection');
        if (!section || section.style.display === 'none' || document.hidden) return;
        var modal = document.getElementById('writeReviewModalOverlay');
        if (modal && modal.style.display && modal.style.display !== 'none') return;
        try {
            var data = await RWL.apiRequest('/api/reviews');
            if (reviewsSignature(data.reviews) !== reviewsLiveSignature) await showReviewsPage();
        } catch (error) {}
    }, 20000);
}

function customerPanelAvatarSrc(user) {
    return userProfileImageSrc(user);
}
