import json
import numpy as np
import requests
from flask import Flask, request, jsonify

# from flask_cors import CORS

app = Flask(__name__)


# Uncomment this line if you are making a Cross domain request
# CORS(app)

# Testing URL
@app.route('/hello/', methods=['GET', 'POST'])
def hello_world():
    return 'Hello, World!'


@app.route('/start-bot', methods=['POST'])
def image_classifier():
    response = {"success": False}
    data = request.json()

    if not data['id']:
        # indicate that the request was a success
        response["message"] = 'No image passed'
        # Returning JSON response to the frontend
        return jsonify(response)

    # if not data['id']:
    #     # indicate that the request was a success
    #     response["message"] = 'No image passed'
    #     # Returning JSON response to the frontend
    #     return jsonify(response)





    # indicate that the request was a success
    response["success"] = True

    # Returning JSON response to the frontend
    return jsonify(data)