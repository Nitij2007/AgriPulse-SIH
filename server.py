import os
import posixpath
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CleanURLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        path = path.split('?', 1)[0].split('#', 1)[0]
        path = urllib.parse.unquote(path)
        path = posixpath.normpath(path)
        
        words = path.split('/')
        words = [w for w in words if w]
        
        filepath = DIRECTORY
        for word in words:
            if os.path.dirname(word) or word in (os.curdir, os.pardir):
                continue
            filepath = os.path.join(filepath, word)
            
        if os.path.isdir(filepath):
            index = os.path.join(filepath, "index.html")
            if os.path.exists(index):
                return index
            return filepath
            
        if os.path.isfile(filepath):
            return filepath
            
        if os.path.isfile(filepath + ".html"):
            return filepath + ".html"
            
        return filepath

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    ThreadingHTTPServer.allow_reuse_address = True
    print(f"AgriPulse Clean URL Server running at http://localhost:{PORT}", flush=True)
    server = ThreadingHTTPServer(("", PORT), CleanURLHandler)
    server.serve_forever()
