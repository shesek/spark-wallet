# Adding Spark to startup with `systemd`

```bash
# Set config options in ~/.spark-wallet/config
$ echo login=bob:superSecretPass123 | tee -a ~/.spark-wallet/config

# Create service file from template
$ curl -s https://raw.githubusercontent.com/ElementsProject/spark/master/scripts/spark-wallet.service |
  sed "s~{cmd}~`which spark-wallet`~;s~{user}~`whoami`~" |
  sudo tee /etc/systemd/system/spark-wallet.service

# Inspect the generated service file, then load and start the service
$ sudo systemctl daemon-reload
$ sudo systemctl enable spark-wallet && sudo systemctl start spark-wallet
```
