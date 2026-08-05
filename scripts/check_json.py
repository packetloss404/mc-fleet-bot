import json
d = json.load(open('/mnt/d/projects/mc-fleet-bot/docs/masterplans/03-houston-tunnel-system/build-info.json'))
print(json.dumps(d, indent=2))
