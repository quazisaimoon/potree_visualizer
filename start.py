import subprocess
import os
import webbrowser
import time
import threading


def start_node_server():
    subprocess.check_call(["npm", "start"], cwd=os.getcwd())

def start_flask_server():
    subprocess.check_call(["flask", "run"], cwd=os.getcwd())

threading.Thread(target=start_node_server).start()
threading.Thread(target=start_flask_server).start()

time.sleep(2)   
print("hello world")
webbrowser.open("http://localhost:1234/start_cloud/start.html")