"""Start the local installation and open it only after the server is bound."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError
import webbrowser

ROOT = Path(__file__).resolve().parent
URL = 'http://localhost:8765/'

def main():
    try:
        with urlopen(URL, timeout=2) as response:
            existing = response.read(8192).decode('utf-8', errors='replace')
        if 'Life Audit' in existing:
            webbrowser.open(URL)
            print('Life Audit is already running:', URL)
            return
    except (URLError, OSError):
        pass
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8765), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    except OSError as error:
        print('Could not start Life Audit:', error)
        print('Port 8765 may be used by another app. Keep this message for troubleshooting.')
        input('Press Enter to close.')
        return
    print('Life Audit is ready:', URL, flush=True)
    print('Keep this Terminal window open during the installation. Press Control-C to stop.', flush=True)
    webbrowser.open(URL)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nLife Audit stopped.')
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
