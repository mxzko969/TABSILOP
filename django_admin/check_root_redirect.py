import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/'
req = urllib.request.Request(url, method='GET')
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        print('HTTP', resp.status)
        print('URL:', resp.geturl())
        print('Headers:')
        for k, v in resp.getheaders():
            print(k + ':', v)
except urllib.error.HTTPError as e:
    print('HTTPError', e.code)
    print(e.read().decode('utf8', errors='ignore'))
except Exception as e:
    print('ERR', e)
