# Usernames

## Context

In order to enable support for accounts across multiple networks on the backend, a username formatting system has been developed to add the ability for the database to differentiate accounts between different networks.

For instance, a user might own the usernames `abc` on Hive and `abc123` on Avalon networks respectively. Another user might also own `abc123` on Hive, which not owned by that user on Avalon. The username formatting system is able to identify that the `abc123` username do not belong to the same owner on both networks, provided that the account is correctly registered on the backend.

Let's say that the user that owns `abc` on Hive and `abc123` on Avalon is a legitimate paying customer, but the user that owns `abc123` on Hive is not. The username formatting system enables network specific whitelists so that only the private key of `abc123` account on Avalon can be used for authentication, while the posting key for same username on Hive cannot be used to authenticate.

On the client side, the user makes API calls by specifying the network as another argument alongside the username itself. The default is `all` where it assumes that the same username on both networks belong to the same person.

## Username formatting

Only Hive and Avalon networks are supported at the moment.

The normal convention for a complete username that includes the network is
```
username@network
```
Where `network` can be `hive`, `dtc` and `all` (referring to both networks).

For example, `techcoderx@all` refers to `techcoderx` on both Hive and Avalon networks at the same time. `alive@dtc` refers to `alive` on Avalon, but not on Hive.

This formatting applies when referring to usernames in databases as well as `whitelist.txt` file.

## Shawp refill memos

For technical reasons, the username formatting for Shawp refill memos on Avalon, Hive and Steem networks will differ slightly. A complete memo for Shawp refills looks something like this:
```
to: network@username
```
Where `network` can be `hive`, `dtc`. The `network` part is omitted for `all` networks (for example `to: @username`).

The memo can also be left blank when performing the transfer from the same wallet as the target username, assuming that the target network for the username is `all`.