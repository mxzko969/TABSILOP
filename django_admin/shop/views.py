from django.shortcuts import render
from django.http import JsonResponse
from .models import Product


def products_list(request):
	products = []
	for p in Product.objects.all():
		products.append({
			'name': p.name,
			'category': p.category,
			'image_url': request.build_absolute_uri(p.image.url) if p.image else None,
		})
	return JsonResponse(products, safe=False)
