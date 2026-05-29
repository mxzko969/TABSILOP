from django.db import models


class Customer(models.Model):
    client_id = models.CharField(max_length=64, unique=True)
    full_name = models.CharField(max_length=140)
    contact_number = models.CharField(max_length=40)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    date_registered = models.DateTimeField(auto_now_add=True)
    rewards_points = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-date_registered']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'

    def __str__(self):
        return f"{self.client_id} — {self.full_name}"

    @property
    def order_count(self):
        return self.orders.count()


class Order(models.Model):
    BUNDLE_CHOICES = [
        ('Cacao Solo', 'Cacao Solo'),
        ('Barkada', 'Barkada'),
        ('Gift Pack', 'Gift Pack'),
    ]

    customer = models.ForeignKey(Customer, related_name='orders', on_delete=models.CASCADE)
    bundle = models.CharField(max_length=32, choices=BUNDLE_CHOICES, default='Cacao Solo')
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    time = models.TimeField()
    extras = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"{self.bundle} ({self.quantity}) — {self.customer.client_id}"


class Product(models.Model):
    CATEGORY_CHOICES = [
        ('Cacao Solo', 'Cacao Solo'),
        ('Barkada', 'Barkada'),
        ('Gift Pack', 'Gift Pack'),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='Cacao Solo')
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return self.name
