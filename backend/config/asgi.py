"""
ASGI config for enterprise stock prediction platform.

Exposes the ASGI callable as a module-level variable named ``application``.
Routes HTTP requests to standard Django ASGI application and WebSocket requests
to Channels ProtocolTypeRouter with AllowedHostsOriginValidator.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import market_data.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        URLRouter(
            market_data.routing.websocket_urlpatterns
        )
    ),
})
