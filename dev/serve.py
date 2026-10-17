# 확인용 로컬 서버: 캐시를 끈다 (고친 js 가 브라우저 캐시 때문에 안 바뀌어 보이는 일 방지)
# python dev/serve.py [포트=3240]  → http://127.0.0.1:3240/index.html?check
# 확인이 끝나면 끈다. 바깥에 열지 않는다 (127.0.0.1 만)
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 3240
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
