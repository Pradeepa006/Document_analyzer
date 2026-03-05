import json
from urllib import request

url='http://127.0.0.1:8000/api/v1/query'
data=json.dumps({"document_id":"f2d080d2-a7e4-45a4-869a-669cbfe438ee","question":"Summarize this document"}).encode('utf-8')
req=request.Request(url,data=data,headers={'Content-Type':'application/json'})
try:
    resp=request.urlopen(req,timeout=30)
    print(resp.status)
    print(resp.read().decode())
except Exception as e:
    print('ERROR',e)
