import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cacao_admin.settings')
django.setup()

from shop.models import Product

names = [
    ('Cacao Solo', 'cacao-solo.svg'),
    ('Barkada', 'barkada.svg'),
    ('Gift Pack', 'gift-pack.svg'),
]

for name, img in names:
    qs = Product.objects.filter(name=name).order_by('pk')
    if qs.exists():
        p = qs.first()
        # remove duplicates if any
        qs.exclude(pk=p.pk).delete()
        p.category = name
        p.image = f'products/{img}'
        p.save()
        print('Updated:', p.name, p.image.name)
    else:
        p = Product.objects.create(name=name, category=name, image=f'products/{img}')
        print('Created:', p.name, p.image.name)

print('Done')
