from django.contrib import admin
from django.utils.html import format_html

from .models import Customer, Order, Product


class OrderInline(admin.TabularInline):
    model = Order
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('bundle', 'quantity', 'price', 'date', 'time', 'extras', 'notes')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('client_id', 'full_name', 'contact_number', 'email', 'date_registered', 'rewards_points', 'order_count')
    search_fields = ('client_id', 'full_name', 'email', 'contact_number')
    readonly_fields = ('date_registered', 'order_count')
    inlines = [OrderInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'bundle', 'quantity', 'price', 'date', 'time', 'created_at')
    list_filter = ('bundle', 'date', 'created_at')
    search_fields = ('customer__client_id', 'customer__full_name', 'notes', 'extras')
    autocomplete_fields = ('customer',)
    readonly_fields = ('created_at',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'image_preview', 'created_at')
    readonly_fields = ('created_at', 'image_preview')
    search_fields = ('name', 'category')
    list_filter = ('category',)
    fieldsets = (
        (None, {
            'fields': ('name', 'image', 'image_preview')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 80px; height: auto;" />',
                obj.image.url
            )
        return "No image"

    image_preview.short_description = 'Preview'
