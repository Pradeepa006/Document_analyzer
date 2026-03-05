import requests

url = 'http://127.0.0.1:8000/api/v1/query'
questions = [
    'Summarize this document',
    'What is the license of this document?'
]
for q in questions:
    try:
        r = requests.post(url, json={'document_id':'3a1fdf3b-fa9b-4013-84de-a704c6633a81','question':q}, timeout=30)
        print('QUESTION:', q)
        print(r.status_code)
        print(r.text)
        print('-'*80)
    except Exception as e:
        print('ERROR', e)
