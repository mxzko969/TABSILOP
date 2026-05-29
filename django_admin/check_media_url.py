import urllib.request

url = 'http://127.0.0.1:8000/media/products/cacao-solo.svg'
try:
    with urllib.request.urlopen(url, timeout=5) as resp:
        print('HTTP', resp.status)
except Exception as e:
    print('ERR', e)
