# import json
import random
import os
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from modular_tools.pc_import.pcimport import *


app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        # gathering data
        file = request.files["file"]
        file.save(file.filename)

        # running python on the data
        data = os.path.join(os.getcwd(), file.filename)
        pointcloud_octree_path = main(os.path.join(os.getcwd(), file.filename))

        # making a package
        result = {
            "data": data,
            "octree_path": pointcloud_octree_path
        }
        
        # remove the duplicate point cloud file
        # os.remove(os.path.join(os.getcwd(), file.filename)) 
        
        # returning the package to js
        return {
            "response": "OK",
            "data": result
        }

       
    if request.method == 'GET':
        random_num = random.randint(1, 100)        
        response = jsonify({'data': random_num})
        # response.headers.add('Access-Control-Allow-Origin', '*')

        return response
    
@app.route('/send-json5-to-flask', methods=['GET', 'POST'])
def get_json():
    if request.method == "POST":
        print("got a post req from js")
        print(request)

        return "some response"




# if __name__ == '__main__':
#     print("running on port, ", port)
#     app.run(host="localhost", port=port, debug=True)
