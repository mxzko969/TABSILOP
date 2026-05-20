import os
import django
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cacao_admin.settings')
django.setup()

from shop.models import Product
from django.conf import settings

name = 'Cacao Solo'
try:
    p = Product.objects.filter(name=name).first()
    if not p:
        print('Product not found:', name)
    else:
        old = p.image.name if p.image else None
        # assign existing media file
        p.image.name = 'products/cacao-solo.svg'
        p.save()
        new = p.image.name
        media_path = Path(settings.MEDIA_ROOT) / 'products' / Path(new).name
        print('Product:', p.name)
        print('Old image:', old)
        print('New image:', new)
        print('Media file exists on disk:', media_path.exists(), str(media_path))
        print('Public URL:', f"http://127.0.0.1:8000{p.image.url}")
except Exception as e:
    print('Error:', e)
