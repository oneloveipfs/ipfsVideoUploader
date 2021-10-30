# Shawp

Shawp is a payment system that processes crypto payments, both natively and using 3rd party payment processors, specifically for hosting credits system. It also handles credits consumption, where hosting credits are deducted from customers' balances daily based on the current disk usage.

Refer to [ConfigDocs.md](https://github.com/oneloveipfs/ipfsVideoUploader/blob/master/docs/ConfigDocs.md) for configuration guide.

## HTTP API

Shawp offers a set of APIs when enabled in `config.json`. APIs listed below are GET API unless specified.

#### Shawp configuration
```
/shawp_config
```
*(There are no arguments to be specifed in the URL for this API call)*

#### Shawp customer info
```
/shawp_user_info?access_token=AUTH_TOKEN
```

* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

#### Refill history
```
/shawp_refill_history?start=0&count=5&access_token=AUTH_TOKEN
```
* `start` *(optional)*: Starting index of refill history to begin with, beginning with the latest refill. Default: 0.
* `count` *(required)*: Number of refills to return.
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.

#### Consumption history
```
/shawp_consumption_history?start=0&count=5&access_token=AUTH_TOKEN
```
* `start` *(optional)*: Starting index of consumption history to begin with, beginning with the latest consumption recorded. Default: 0.
* `count` *(required)*: Number of days of consumption data to return.
* `AUTH_TOKEN` *(required)*: Access token obtained from `/logincb` or HiveSigner login access token.
* `scauth` *(optional)*: Set this to `true` if `AUTH_TOKEN` provided is a HiveSigner access token.