# This script is straight up python 3, so get on that level boi
import argparse
import json
import sys

def get_address(data):
  print(data['address'])

def get_segwit(data):
  print(data['bip9_softforks']['segwit']['status'])

def get_pubkey(data):
  print(data['identity_pubkey'])

def get_id(data):
  print(data[0]['NetworkSettings']['Networks']['docker_btcd']['IPAddress'])

def get_invoice(data):
  print(data['pay_req'])

def get_idx(data):
  channel_point = data['channels'][0]['channel_point']
  print(channel_point.split(':')[1])

def get_fundingtx(data):
  channel_point = data['channels'][0]['channel_point']
  print(channel_point.split(':')[0])

FUNCTION_MAP = {
  'address' : get_address,
  'segwit': get_segwit,
  'pubkey': get_pubkey,
  'id': get_id,
  'invoice': get_invoice,
  'idx': get_idx,
  'fundingtx': get_fundingtx,
}

parser = argparse.ArgumentParser(description='Process some LND commands bb')
parser.add_argument('command', choices=FUNCTION_MAP.keys())

# Sets a function to use on piped data through inside of FUNCTION_MAP
args = parser.parse_args()
func = FUNCTION_MAP[args.command]
jdata = sys.stdin.read()
data = json.loads(jdata)
func(data)
