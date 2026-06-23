# luci-app-lpac-manager — Руководство пользователя

**Версия:** 1.3.6  
**Пакет:** `luci-app-lpac-manager`  
**Оборудование:** OpenWrt 24.x / 25.x + модем с eSIM + eUICC карта

---

## 1. Веб-интерфейс (LuCI)

### Доступ

Modem → eSIM Manager  
или: `http://192.168.1.1/cgi-bin/luci/admin/modem/lpac-esim`

В заголовке страницы отображается: `eSIM Profile Manager v1.3.6 / lpac 2.3.0 [custom] / QMI`  
— тип сборки `[custom]` или `[official]` определяется автоматически.

---

### Вкладка eSIM Info

Информация о чипе eUICC и состоянии модема.

- **EID** — уникальный идентификатор eUICC (нужен при покупке eSIM-карты)
- Версия прошивки eUICC, свободная память профилей
- Модель модема, оператор, технология (LTE/5G), уровень сигнала, состояние

---

### Вкладка Profiles

Управление eSIM-профилями.

| Кнопка | Действие |
|--------|----------|
| **Switch** | Активировать профиль. Модем перезагрузится (30–60 сек), связь временно пропадёт |
| **Disable** | Деактивировать активный профиль без переключения на другой |
| **Delete** | Удалить disabled профиль — необратимо, требует двойного подтверждения |
| **Rename** | Изменить отображаемое имя (nickname) профиля |
| **Reboot Modem** | Принудительная перезагрузка модема |

> Switch и Download выполняются асинхронно. После запуска отображается индикатор занятости — дождитесь его исчезновения перед следующей операцией.

---

### Вкладка Download Profile

Загрузка нового eSIM-профиля от провайдера.

**Способы ввода:**

1. **QR-код** — загрузить файл изображения или сфотографировать экран камерой устройства. Декодирование происходит локально в браузере (jsQR), без отправки изображения на сервер
2. **LPA-строка** — вставить текст вида `LPA:1$rsp.example.com$MATCHING-ID`
3. **Раздельный ввод** — SM-DP+ адрес, Matching ID и Confirmation Code по отдельности

Загрузка занимает 60–120 секунд. Прогресс отображается через lock-polling.

---

### Вкладка Notifications

Уведомления eUICC (RSP-протокол).

| Кнопка | Действие |
|--------|----------|
| **Process & Remove All** | Отправить уведомления операторам и удалить (требует интернет) |
| **Clear All (Offline)** | Удалить без отправки операторам |

Уведомления накапливаются после операций switch/download/delete. Рекомендуется очищать периодически.

---

### Вкладка Configuration

Настройки подключения к модему. Сохраняются в UCI (`/etc/config/lpac-esim`).

**Backend Type** — протокол взаимодействия с eUICC:

| Вариант | Когда использовать |
|---------|-------------------|
| **QMI** | Кастомная сборка lpac с нативным libqmi. Модем в QMI-режиме (PID 9025). Постоянное соединение, лучшая надёжность |
| **uQMI** | Официальный lpac из репо OpenWrt 25.12. Использует CLI-утилиту `uqmi`. Не требует libqmi |
| **MBIM** | Модем в MBIM-режиме (PID 90d5). Рекомендуется включить MBIM Proxy |
| **AT** | Резервный вариант через AT-порт. Самый медленный |

**QMI Device** — путь к QMI/uQMI устройству (обычно `/dev/cdc-wdm0`)  
**QMI SIM Slot** — номер UIM-слота (1 или 2; для внешней eSIM-карты обычно 1)  
**AT Device** — путь к AT-порту (обычно `/dev/ttyUSB2` или `/dev/ttyUSB3`); используется для reboot-каскада в любом режиме  
**MBIM Device** — путь к MBIM-устройству (обычно `/dev/cdc-wdm0`)  
**MBIM Proxy** — включить если ModemManager активен или несколько клиентов используют MBIM

---

### Вкладка Diagnostics

#### Build Info (верхний блок)

При открытии вкладки автоматически определяется тип сборки lpac:

| Тип | Значение | Рекомендуемый бэкенд |
|-----|----------|----------------------|
| **Official OpenWrt** (жёлтый) | Официальный пакет с динамическими .so драйверами | uqmi |
| **Custom native-QMI** (зелёный) | Кастомная сборка со статическим libqmi | qmi |
| **Unknown** (серый) | Тип не определён | at |

Если текущий выбранный бэкенд несовместим с данной сборкой lpac — появится предупреждение с рекомендацией перейти в Config и сменить бэкенд.

#### System Log / System Check

| Кнопка | Что показывает |
|--------|----------------|
| **System Log** | Отфильтрованный syslog: события модема, lpac, сети |
| **System Check** | Лог инициализации backend: найденные утилиты, версии, устройства |
| **Copy Log** | Скопировать текущий лог в буфер обмена |

#### Сброс модема (4 уровня)

| Кнопка | Что делает |
|--------|-----------|
| **Soft Reset** | Radio off → radio on без USB-переподключения |
| **USB Reset** | Переподключение USB-порта через sysfs |
| **SIM Reset** | Power cycle UIM-слота |
| **Hard Reboot** | Полная перезагрузка ОС модема: QMI DMS → AT+CFUN=1,1 → USB sysfs |

#### AT-терминал

Прямая отправка AT-команд через серийный порт.  
Preset-кнопки: `ATI`, `AT+CGSN`, `AT+CIMI`, `AT+CSQ`, `AT^CARDMODE`.

---

## 2. Командная строка (SSH)

### Интерактивное TUI-меню

```sh
lpac-esim
```

При запуске — выбор бэкенда (QMI/uQMI/MBIM/AT), затем основное меню:

1. **Profile Management** — list, switch, disable, rename, delete, download
2. **Status & Diagnostics** — chip info, modem monitor, full status
3. **Maintenance** — reboot, USB reset, notifications

### One-shot команды

```sh
# Информация о чипе
lpac-esim chip

# Список профилей
lpac-esim profiles

# Переключить профиль (по ICCID, номеру из списка или AID)
lpac-esim switch 897010260225401535

# Деактивировать профиль (без переключения)
lpac-esim disable 897010260225401535

# Удалить disabled профиль
lpac-esim delete 897010260225401535

# Переименовать профиль
lpac-esim nickname 897010260225401535 --nickname "МегаФон основной"

# Перезагрузить модем
lpac-esim reboot-modem

# Уведомления
lpac-esim notif-list
lpac-esim notif-process
lpac-esim notif-clear

# Live-монитор модема
lpac-esim modem-status

# Проверка окружения (tools, версии, устройства)
lpac-esim doctor
```

### Загрузка профиля через CLI

```sh
# Диалоговый режим (рекомендуется)
lpac-esim
# → 1) Profile Management → 7) Download new eSIM profile

# One-shot
lpac-esim download --lpa 'LPA:1$rsp.example.com$MATCHING-ID-HERE'
```

### API-режим (для скриптов)

```sh
lpac-esim --api chip 2>/dev/null
lpac-esim --api profiles 2>/dev/null
lpac-esim --api version 2>/dev/null
```

Возвращает JSON вида `{"type":"lpa","payload":{"code":0,"data":{...}}}`.

### Прямой вызов lpac (без backend-скрипта)

```sh
# QMI (кастомная сборка с нативным libqmi)
LPAC_APDU=qmi LPAC_HTTP=curl \
LPAC_APDU_QMI_DEVICE=/dev/cdc-wdm0 \
LPAC_APDU_QMI_UIM_SLOT=1 \
lpac chip info

# uQMI (официальная сборка OpenWrt 25.12)
LPAC_APDU=uqmi LPAC_HTTP=curl \
LPAC_APDU_QMI_DEVICE=/dev/cdc-wdm0 \
LPAC_APDU_QMI_UIM_SLOT=1 \
lpac chip info

# MBIM
LPAC_APDU=mbim LPAC_HTTP=curl \
LPAC_APDU_MBIM_DEVICE=/dev/cdc-wdm0 \
LPAC_APDU_MBIM_USE_PROXY=true \
lpac chip info

# AT
LPAC_APDU=at LPAC_HTTP=curl \
LPAC_APDU_AT_DEVICE=/dev/ttyUSB3 \
lpac chip info

# Debug trace
LPAC_APDU=qmi LPAC_HTTP=curl \
LPAC_APDU_QMI_DEVICE=/dev/cdc-wdm0 \
LPAC_APDU_QMI_UIM_SLOT=1 \
LIBEUICC_DEBUG_HTTP=1 LIBEUICC_DEBUG_APDU=1 \
lpac profile list 2>&1
```

---

## 3. Выбор сборки lpac и бэкенда

### Официальная сборка (OpenWrt 25.12)

```sh
apk add lpac   # OpenWrt 25.12+
```

- Устанавливает `/usr/bin/lpac` (shell wrapper) и `/usr/lib/lpac/*.so` (драйверы)
- Драйверы: `uqmi`, `mbim`, `at`, `pcsc`
- **Бэкенд в Config: uQMI**
- Зависимость: пакет `uqmi` (обычно уже установлен)

### Кастомная сборка (lpac_openwrt)

Собирается отдельно с `-DLPAC_WITH_APDU_QMI=ON`.

- Устанавливает `/usr/bin/lpac` (ELF, статически слинкован с libqmi)
- Драйверы: `qmi`, `mbim`, `at`
- **Бэкенд в Config: QMI**
- Зависимость: пакет `libqmi`
- Преимущество для X55: постоянное QMI-соединение вместо fork на каждую APDU-транзакцию

### Как определить что установлено

Открыть LuCI → **Modem → eSIM Manager → Diagnostics**.  
В блоке **Build Info** будет тип сборки и рекомендуемый бэкенд.

Или из SSH:
```sh
# Официальная: есть .so драйверы
ls /usr/lib/lpac/*.so 2>/dev/null

# Кастомная: libqmi в зависимостях бинаря
ldd /usr/lib/lpac 2>/dev/null | grep libqmi
# или если бинарь в /usr/bin/lpac напрямую:
ldd /usr/bin/lpac 2>/dev/null | grep libqmi
```

---

## 4. Диагностика проблем

### Базовые проверки

```sh
# Модем виден системе?
mmcli -L
ls -la /dev/cdc-wdm0 /dev/ttyUSB*

# Backend отвечает?
lpac-esim --api chip 2>/dev/null | head -c 200

# Версия и тип сборки lpac
lpac-esim --api version 2>/dev/null | jq .

# Проверка окружения (найденные утилиты, устройства)
lpac-esim doctor
```

### Логи

```sh
# Syslog (только lpac и модем)
logread | grep -E 'lpac|modem|qmi|mbim' | tail -30

# Подробный лог инициализации backend
cat /tmp/lpac-esim/run.log

# Результат последнего download
cat /tmp/lpac-esim/download.json

# Статус lock (если зависло)
cat /tmp/lpac-esim/lock 2>/dev/null || echo "no lock"
```

### Проблемы с TLS при загрузке профиля

```sh
# Отключить прокси
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

# Проверить TLS
curl -v --connect-timeout 10 https://rsp.truphone.com/ 2>&1 | head -15

# Проверить CA-сертификаты
ls -la /etc/ssl/certs/ca-certificates.crt
opkg install ca-certificates ca-bundle   # или: apk add ca-certificates
```

Backend автоматически создаёт временный `.curlrc` с `insecure` на время download если обнаруживает mbedTLS-окружение OpenWrt 24.x.

### Зависание операции (busy banner не пропадает)

```sh
# Проверить lock
cat /tmp/lpac-esim/lock

# Принудительно снять lock (только если операция точно завершилась)
rm -f /tmp/lpac-esim/lock

# Перезагрузить страницу
```

### Backend недоступен (404 от LuCI)

```sh
# Перезапустить rpcd
/etc/init.d/rpcd restart

# Очистить кэш LuCI
rm -rf /tmp/luci-modulecache /tmp/luci-indexcache*

# Проверить ACL
ls /usr/share/rpcd/acl.d/luci-app-lpac-manager.json
```

### USB-устройства не найдены

```sh
# Список USB-устройств
lsusb

# Режим модема (QMI: 9025, MBIM: 90d5)
lsusb | grep -i foxconn

# QMI/MBIM device
ls /dev/cdc-wdm*

# AT-порты
ls /dev/ttyUSB*

# Если устройств нет — проверить режим модема
# Переключение режима (если поддерживается):
# AT^SETMODE=?   или через usb-modeswitch
```

---

## 5. Известные ограничения

- **mbedTLS на OpenWrt 24.x** — может не верифицировать TLS-сертификаты SM-DP+ серверов. Backend применяет workaround автоматически
- **После switch** — модем недоступен 30–60 сек, profiles/modem-status вернут ошибку — это нормально
- **Download привязан к EID** — QR-код для другой eUICC даст ошибку `EID doesn't match`
- **HTTP-прокси** — backend автоматически отключает `http_proxy`/`https_proxy` перед вызовом lpac
- **uQMI fork overhead** — официальный lpac через uqmi запускает отдельный процесс на каждую APDU-транзакцию. При медленных операциях (download) это заметно. Кастомная сборка с нативным QMI работает быстрее
- **Disable на уже disabled профиле** — возвращает `already_disabled`, не ошибку
- **SIM Slot** — нумерация с 1 (не с 0 как в старых версиях). При обновлении с версий ниже 1.3.6 слот мигрирует автоматически
