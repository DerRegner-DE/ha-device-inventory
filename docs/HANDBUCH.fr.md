# Gestion des Appareils — Manuel d'utilisation

Version : v3.1.0 · 2026-10-05

Ce manuel décrit l'installation et l'utilisation de la Gestion des Appareils et répond aux questions les plus fréquentes du forum. Vous débutez ? Commencez par le premier chapitre et le démarrage rapide. Si vous connaissez une version antérieure, allez directement au chapitre qui vous pose question.

---

## Sommaire

1. [À quoi sert la Gestion des Appareils](#à-quoi-sert-la-gestion-des-appareils)
2. [Installation, mise à jour, désinstallation](#installation-mise-à-jour-désinstallation)
3. [Free et Pro](#free-et-pro)
4. [Démarrage rapide en 5 étapes](#démarrage-rapide-en-5-étapes)
5. [Enregistrer des appareils](#enregistrer-des-appareils)
6. [Intégration Home Assistant (MQTT-Discovery)](#intégration-home-assistant-mqtt-discovery)
7. [Appareils multicanaux (parent-enfant)](#appareils-multicanaux-parent-enfant)
8. [Fusionner les appareils en double](#fusionner-les-appareils-en-double)
9. [Documentation d'assurance & succession — les workflows types](#documentation-dassurance--succession--les-workflows-types)
10. [Filtres, recherche et tri](#filtres-recherche-et-tri)
11. [Corbeille & instantanés de la base de données](#corbeille--instantanés-de-la-base-de-données)
12. [Questions fréquentes (FAQ)](#questions-fréquentes-faq)
13. [Résolution des problèmes](#résolution-des-problèmes)
14. [Protection des données et mentions légales](#protection-des-données-et-mentions-légales)
15. [Support et contact](#support-et-contact)

---

## À quoi sert la Gestion des Appareils

Une maison connectée grandit : routeurs, capteurs, prises, caméras, thermostats, passerelles. Où se trouve le numéro de série du répéteur, quand le thermostat a-t-il été acheté, la garantie court-elle encore, quel interrupteur est ponté ? La Gestion des Appareils est un inventaire consultable de tous les appareils de la maison — directement dans Home Assistant.

Usages typiques :

- **Assurance** — inventaire avec numéros de série, dates d'achat, photos et justificatifs ; en cas de sinistre, tout est à portée de main.
- **Garantie** — date d'achat et fin de garantie pour chaque appareil.
- **Maintenance** — firmware, adresse IP et MAC, réseau et intégration en un coup d'œil.
- **Remise, démontage, succession** — la liste pour les proches, l'électricien ou l'acheteur : ce qui fonctionne sans Home Assistant, quels interrupteurs sont pontés, où se trouvent les documents.
- **Location et fiscalité** — documenter l'équipement de logements loués ou les appareils à usage professionnel.

L'application fonctionne comme module complémentaire Home Assistant avec sa propre base de données. Elle s'utilise sur smartphone, tablette et PC et fonctionne aussi sans connexion ; les modifications sont synchronisées dès que la connexion est rétablie.

---

## Installation, mise à jour, désinstallation

**Prérequis :** Home Assistant OS ou Supervised (les modules complémentaires doivent être disponibles), architecture amd64, aarch64 (p. ex. Raspberry Pi 4/5) ou armv7, un navigateur à jour. La caméra et le scanner de codes-barres nécessitent une connexion chiffrée (HTTPS), voir [Caméra et scanner](#caméra-et-scanner).

**Installer :**

1. Dans Home Assistant, **Paramètres → Modules complémentaires** (dans les versions récentes **Applications**) → **Boutique des modules complémentaires**.
2. En haut à droite, le menu à trois points → **Dépôts**.
3. Collez `https://github.com/DerRegner-DE/ha-device-inventory`, cliquez sur **Ajouter**, fermez la boîte de dialogue.
4. Dans la boutique, recherchez **Geraeteverwaltung** (rechargez la page si nécessaire) → **Installer**.
5. **Démarrer**, activez **Afficher dans la barre latérale**, **Ouvrir l'interface utilisateur Web**.

**Mettre à jour :** Home Assistant signale une mise à jour disponible sous *Paramètres → Modules complémentaires → Geräteverwaltung* (et dans les notifications). Cliquez sur **Mettre à jour** ; *Conserver une sauvegarde de la version précédente* est recommandé, car les mises à jour peuvent étendre la base de données. Vous pouvez aussi activer *Mise à jour automatique*. Les nouveautés figurent dans le journal des modifications (Changelog) du module complémentaire. Après une mise à jour, consultez la section « Après la mise à jour » du démarrage rapide.

**Désinstaller :** *Paramètres → Modules complémentaires → Geräteverwaltung → Désinstaller*. Home Assistant supprime alors le répertoire de données du module complémentaire avec la base de données, les photos et la licence. Sauvegardez avant : *Paramètres → Exporter les Données* (JSON, Excel, PDF) ou une sauvegarde Home Assistant qui inclut le module complémentaire.

---

## Free et Pro

Les fonctions de base sont gratuites ; les fonctions avancées sont débloquées par une clé de licence achetée une seule fois (**9,99 €**, sans abonnement).

| | Free | Pro |
|---|:---:|:---:|
| Appareils | jusqu'à 50 | illimités |
| Langues | anglais | allemand, anglais, espagnol, français, russe |
| Tableau de bord, recherche, filtres, mode hors ligne, barre latérale | ✓ | ✓ |
| Export JSON | ✓ | ✓ |
| Import HA, détection automatique du type, recatégorisation | — | ✓ |
| Export Excel et PDF avec modèles | — | ✓ |
| Caméra, scanner QR/codes-barres, photos et documents | — | ✓ |
| Édition en masse | — | ✓ |
| MQTT-Discovery (publier les appareils dans HA) | — | ✓ |

**Acheter :** via le lien dans le README du dépôt GitHub ; la clé arrive par e-mail avec la confirmation d'achat. Une clé est valable pour trois installations au maximum et n'expire pas.

**Activer :** *Paramètres → Licence*, saisissez la clé dans le champ *Clé de licence*, cliquez sur **Activer**. Les fonctions Pro sont immédiatement disponibles. Lors de l'activation, puis de temps en temps, le module complémentaire vérifie la clé auprès du prestataire de paiement Lemon Squeezy ; sans Internet, la dernière vérification réussie reste valable.

Si vous ne recevez pas d'e-mail après l'achat : vérifiez le dossier spam, sinon écrivez à support@derregner.info.

---

## Démarrage rapide en 5 étapes

1. **Installer le module complémentaire** via l'URL de la boutique des modules complémentaires Home Assistant (voir le README du dépôt GitHub). Après l'installation, la Gestion des Appareils apparaît comme entrée dans la barre latérale de HA.
2. **Activer la licence Pro** sous *Paramètres → Licence*. Sans licence, vous pouvez gérer jusqu'à 50 appareils, l'interface est alors en anglais — tout le reste (multilingue, Excel, MQTT, caméra, codes-barres, documents) est Pro.
3. **Importer les appareils HA** sous *Paramètres → Import Home Assistant → Importer appareils HA*. Pour les grandes installations (300+), l'import peut durer une minute ; il s'exécute en arrière-plan avec un indicateur de progression. Sont repris : nom, fabricant, modèle, firmware, pièce et étage, intégration, réseau et — depuis 3.1.0 — numéro de série, adresse MAC et alimentation (pile/batterie), dans la mesure où Home Assistant les connaît. Un nouvel import ne crée pas de doublons et, pour les appareils existants, ne complète le numéro de série et la MAC que dans les champs vides.
4. **Facultatif : activer MQTT-Discovery** sous *Paramètres → Intégration Home Assistant → Publier les appareils dans HA* — le chapitre [Intégration Home Assistant](#intégration-home-assistant-mqtt-discovery) explique si c'est utile.
5. **Compléter les premiers appareils** : touchez un appareil dans la liste, puis *Modifier*, et saisissez au moins la date d'achat, la fin de garantie et le prix d'achat. Ajoutez une photo et des photos d'installation, téléversez les justificatifs comme documents — prêt pour la documentation d'assurance.

### Après la mise à jour vers 3.1.0

Une seule fois, dans cet ordre :

1. *Paramètres → Import Home Assistant → Importer appareils HA* — complète le numéro de série et la MAC des appareils existants et supprime les rattachements erronés à un routeur (voir [Appareils multicanaux](#appareils-multicanaux-parent-enfant)).
2. *Paramètres → Doublons possibles* — vérifier et fusionner les appareils en double (voir [Appareils en double](#fusionner-les-appareils-en-double)).
3. *Paramètres → Recatégoriser les appareils → Aperçu et sélection* — depuis 3.1.0, l'aperçu affiche nettement plus de propositions qu'avant, car la détection voit pour la première fois les classes d'appareils de Home Assistant. L'alimentation est également complétée. Consultez d'abord l'aperçu, décochez certaines lignes, puis appliquez. Tout peut être annulé via les instantanés et l'historique de l'appareil.

---

## Enregistrer des appareils

Ajoutez de nouveaux appareils via **Ajouter** dans la barre inférieure, modifiez les appareils existants via la page de détail → **Modifier**. Seuls *Type d'appareil* et *Désignation* sont obligatoires. Le formulaire est divisé en sections repliables :

| Section | Champs |
|---|---|
| Données de base | Type d'appareil, Désignation, Modèle, Fabricant, Firmware |
| Emplacement | Zone issue de Home Assistant (l'étage en découle) |
| Réseau & Alimentation | Réseau, Alimentation, Adresse IP, Adresse MAC |
| Détails | Numéro de Série, AIN / N° Article, Date d'Achat, Garantie jusqu'au |
| Home Assistant | Intégration, Entity ID, Device ID |
| Notes | Fonction, Remarques, « Fonctionne sans Home Assistant ? », « Interrupteur mural ponté ? », Lien externe |

En mode modification, les sections **Photos d'installation** (avec légende, p. ex. « derrière le cache en haut à gauche ») et **Documents** (facture, notice — sous forme de fichier ou de lien) s'ajoutent en dessous. Une photo de l'appareil peut être jointe en haut du formulaire par caméra ou par fichier. Chaque modification est enregistrée dans l'*Historique des modifications* de la page de détail et peut y être annulée individuellement.

**Intégration** est un champ libre : la liste de suggestions contient les intégrations courantes et toutes celles présentes dans votre inventaire ; vous pouvez saisir toute autre valeur.

**Valeurs de sélection :**

- *Réseau :* WiFi, LAN, Zigbee, Z-Wave, Bluetooth, Thread/Matter, DECT, CPL, HomeMatic RF, KNX, Modbus, 1-Wire, RS-232, EnOcean, USB
- *Alimentation :* Adaptateur, 230V, Pile, Batterie, USB, PoE, Solaire, Haute Tension
- *Types d'appareils (32) :* Routeur, Répéteur, CPL, Répéteur DECT, Prise, Interrupteur, Ampoule, Actionneur/Relais, Interrupteur/Bouton, Volet roulant, Thermostat, Contrôleur/Passerelle, Caméra, Sonnette, Carillon, Serrure, Système d'Alarme, Assistant Vocal, Smart TV, Streaming, Écran/Dashboard, Tablette, Enceinte, Électroménager, Robot Tondeuse, Arrosage, Ventilateur, Télécommande, Imprimante, Capteur, Smartphone, Autre

Vous créez vos propres types d'appareils sous *Paramètres → Gérer les catégories* ; ils apparaissent ensuite dans toutes les listes de sélection, dans l'édition en masse et comme onglets de filtre.

### Caméra et scanner

Avec Pro, vous pouvez prendre des photos directement et scanner des codes QR/codes-barres. Une adresse MAC contenue dans le code est reconnue et saisie ; sinon, le contenu est placé comme numéro de série dans le formulaire. Les codes structurés (p. ex. `SN:…|MAC:…|MODEL:…`) remplissent plusieurs champs à la fois. Les navigateurs n'autorisent la caméra que via une connexion chiffrée : via Home Assistant Cloud (Nabu Casa), un certificat propre ou un reverse proxy. En accès via `http://<IP>:8123`, la sélection d'une image existante reste possible, la caméra non.

---

## Intégration Home Assistant (MQTT-Discovery)

De loin la question la plus fréquente du forum. Nous expliquons **ce que** fait l'interrupteur, **quand** il est utile et **comment** s'en débarrasser proprement.

### Que se passe-t-il à l'activation ?

Lorsque vous activez *Publier les appareils dans HA*, le module complémentaire publie **jusqu'à 6 entrées MQTT-Discovery par appareil de l'inventaire** sur le broker configuré dans les options du module complémentaire (par défaut : `core-mosquitto`) :

| Type d'entité | Contenu | Exemple |
|------------|--------|----------|
| Capteur `*_warranty` | Date ISO de fin de garantie | `2027-03-15` |
| Capteur `*_warranty_days` | jours restants sous forme de nombre | `123` |
| Capteur `*_purchase` | Date d'achat | `2024-09-12` |
| Capteur `*_type` | Type d'appareil | `Router` |
| Capteur `*_location` | Emplacement | `Büro OG` |
| Capteur binaire `*_warranty_active` | `on` tant que la garantie court | `on` / `off` |

Ces entités apparaissent dans HA sous *Paramètres → Appareils et services → MQTT*, avec une fiche d'appareil par entrée de l'inventaire.

**Depuis 3.1.0**, le capteur `*_type` porte en plus les informations saisies comme attributs : emplacement, numéro de série, alimentation, fonction, remarques, « Fonctionne sans HA » et « Interrupteur mural ponté » avec leurs remarques, lien externe ainsi que le nombre de photos et de photos d'installation. Les valeurs vides sont omises. Accessible dans les automatisations p. ex. via `state_attr('sensor.landroid_s300_device_type', 'seriennummer')`.

**Retour dans l'application :** Sur la page d'appareil HA de chaque appareil ainsi publié figure le lien **Visiter**. Il ouvre directement cet appareil dans la Gestion des Appareils. Pour les appareils d'autres intégrations (p. ex. la page d'appareil d'origine d'un Shelly), un module complémentaire ne peut pas placer de lien — l'accès passe alors uniquement par la fiche MQTT de l'entrée d'inventaire.

### Identifiants pour le broker MQTT

**À quoi ça sert :** Pour publier, la Gestion des Appareils doit s'authentifier auprès du broker MQTT ; le module complémentaire Mosquitto n'accepte que les participants authentifiés. Sans MQTT, l'application fonctionne entièrement — seuls les capteurs dans HA et le lien *Visiter* sont concernés.

Le module complémentaire demande d'abord les identifiants au Supervisor. Si le module complémentaire Mosquitto les y fournit, il n'y a rien à saisir. Si en revanche le test sous *Paramètres → Intégration Home Assistant → Tester la connexion MQTT* renvoie **« Not authorized »** (code 135), le module complémentaire a besoin d'un utilisateur. Le plus simple est un utilisateur Home Assistant dédié — le module complémentaire Mosquitto accepte tout utilisateur HA :

1. Dans Home Assistant, en bas à gauche **Paramètres** → **Personnes** → ouvrez l'onglet **Utilisateurs** en haut. Si l'onglet manque : cliquez sur votre nom en bas à gauche et activez le **Mode avancé**.
2. En bas à droite, **Ajouter un utilisateur**. Nom d'affichage et nom d'utilisateur p. ex. `geraeteverwaltung`, définissez un mot de passe.
3. Activez **« Ne peut se connecter qu'à partir du réseau local »**, laissez **« Administrateur »** désactivé. **Créer**.
4. **Paramètres** → **Modules complémentaires** (dans les versions récentes **Applications**) → **Geräteverwaltung** → onglet **Configuration**.
5. Saisissez le nom d'utilisateur dans **mqtt_user** et le mot de passe dans **mqtt_password**. **Enregistrer**, redémarrez le module complémentaire.
6. Dans la Gestion des Appareils, *Tester la connexion MQTT* — le résultat doit maintenant être « OK ».

Pourquoi un utilisateur dédié plutôt que votre propre compte : il n'a pas de droits d'administrateur, ne se connecte que depuis le réseau local, et la configuration du module complémentaire contient son mot de passe au lieu du vôtre. Quand il n'est plus nécessaire, vous pouvez le supprimer sans toucher à rien d'autre.

### Quand est-ce utile ?

- **Rappels de garantie** : une automatisation HA sur le capteur binaire `*_warranty_active` qui notifie 30 jours avant l'expiration.
- **Cartes de tableau de bord** : « Tous les appareils sous garantie », « Appareils dont la garantie expire bientôt », triés par `*_warranty_days`.
- **Statistiques d'inventaire** dans le tableau de bord HA, sans ouvrir la Gestion des Appareils.

**Pas** utile si vous utilisez le module complémentaire uniquement comme outil de documentation — il ne crée alors que des fiches HA que personne ne consulte.

### Nettoyer quand vous n'en voulez plus

Une question fréquente : *« Comment supprimer tous les topics MQTT quand je désactive le module complémentaire ? »*

Par défaut, les topics MQTT retained **restent** sur le broker, même si vous désactivez l'interrupteur. C'est une particularité de MQTT-Discovery (HA ne supprime pas les messages retained écrits par un autre producteur). Trois façons de nettoyer proprement :

1. **(Recommandé) Nettoyer les entrées orphelines** : dans la section *Intégration Home Assistant* des paramètres, le bouton **« Nettoyer les entrées orphelines »** existe depuis v2.6.0. Il supprime tous les topics retained des appareils d'inventaire que vous avez déjà supprimés dans la Gestion des Appareils. Les appareils actifs ne sont pas touchés. Sûr comme action de routine.

2. **Supprimer toutes les entrées MQTT** : à côté, le bouton **« Supprimer toutes les entrées MQTT »** (rouge). Avec confirmation. Supprime **chaque** message Discovery publié par le module complémentaire, y compris pour les appareils encore présents dans l'inventaire. Dernière étape judicieuse avant de désactiver durablement MQTT-Discovery.

3. **Manuellement avec MQTT Explorer** : topic `geraeteverwaltung/#` et `homeassistant/+/geraeteverwaltung/+/config` — pour chaque topic, clic droit → « Delete topic ». Seule méthode pour les installations existantes sans v2.6.0.

### Les appareils restent dans HA après leur suppression dans l'add-on

Jusqu'à v2.5.3, un bug ignorait le nettoyage MQTT lors de la suppression d'appareils individuels — les topics Discovery restaient alors, alors que le module complémentaire aurait dû envoyer lui-même un signal « supprimer cet appareil ». Depuis v2.5.3, le nettoyage d'un appareil individuel fonctionne de nouveau de manière fiable. Pour l'existant : un seul clic sur *Nettoyer les entrées orphelines* supprime les restes.

---

## Appareils multicanaux (parent-enfant)

Exemples : Shelly 2PM (deux canaux de prise dans un même boîtier), hubs Tuya, hubs USB, Bosch SHC avec thermostats connectés. Pour de telles configurations, HA crée souvent plusieurs appareils (appareil principal + un sous-appareil par canal/capteur) et les relie via `via_device_id`.

### Ce que la Gestion des Appareils en fait

- Lors de l'import HA, `via_device_id` est analysé et enregistré comme `parent_uuid` dans l'inventaire.
- Dans la vue détaillée d'un sous-appareil, l'encadré **« Fait partie de : … »** figure en haut, avec un lien cliquable vers l'appareil principal.
- Dans la vue détaillée d'un appareil principal figure l'encadré **« Sous-appareils (N) »** avec la liste de tous les enfants.
- Si vous appuyez sur **Retour** dans le sous-appareil, vous revenez à l'appareil principal — et non à la liste globale.

### Masquer les sous-appareils

Avec les configurations multicanaux, la liste s'allonge vite — trois lignes pour un seul appareil physique. Dans la liste, à droite du tri, se trouve le bouton **« Parents uniquement »**. Actif : les sous-appareils sont masqués, le libellé du bouton indique le nombre d'enfants masqués. Le filtre est conservé pendant la session.

**Les routeurs ne sont pas des appareils principaux (depuis 3.1.0) :** dans Home Assistant, FRITZ!Box et UPnP déclarent *chaque* appareil du réseau comme rattaché à eux. Auparavant, l'import en faisait « Fait partie de FRITZ!Box » — la sonnette, le robot tondeuse et les smartphones disparaissaient alors dans le filtre *Parents uniquement*. L'import ne reprend plus ces rattachements à un routeur et supprime ceux existants lors de la prochaine exécution. Les véritables centrales comme le coordinateur Zigbee, le Bosch Smart Home Controller ou le HomematicIP Access Point restent l'appareil principal de leurs appareils. Si un navigateur déjà ouvert affiche encore l'ancien rattachement : *Paramètres → Vider le cache local → Vider le cache*.

**Les hubs de routage ne sont pas masqués :** HA définit aussi `via_device_id` pour les appareils connectés via un pont (pont Zigbee2MQTT → Hue/IKEA/Aqara, coordinateur ZHA → terminaux, clé Z-Wave-JS → terminaux, serveur Matter → terminaux). Ces « enfants » sont du matériel à part entière, seul le pont est logiciel. Le filtre traite donc les appareils avec l'intégration `mqtt`, `zha`, `zwave_js` ou `matter` comme des appareils principaux — sinon le filtre masquerait les vraies lampes et ne laisserait que le pont.

### Appliquer la modification à tous les enfants

Lors de la modification d'un appareil principal avec sous-appareils, une case à cocher **« Appliquer aussi à N sous-appareils »** apparaît à la fin du formulaire. Si elle est cochée, l'enregistrement applique *en plus* de l'appareil principal une mise à jour en masse des champs suivants à tous les enfants :

- Fabricant
- Date d'achat
- Garantie jusqu'au
- Alimentation
- Numéro d'article AIN

Les champs spécifiques au canal ne sont **pas** hérités : désignation, numéro de série, MAC, IP, emplacement, identifiants Home Assistant.

---

## Fusionner les appareils en double

*Nouveau dans 3.1.0.* Depuis HA 2026.8, Home Assistant crée souvent plusieurs entrées pour un seul appareil physique : le Shelly via sa propre intégration et une deuxième fois via la FRITZ!Box ; avec plusieurs FRITZ!Box en maillage, même une fois par box. L'appareil figurait alors plusieurs fois dans l'inventaire.

**Lors de l'import**, l'application regroupe automatiquement en un seul appareil les entrées ayant la même adresse MAC ou Zigbee issues de différentes intégrations ou configurations. L'entrée conservée est celle de l'intégration qui pilote l'appareil (Shelly, Ring, Bosch …), et non celle du routeur. Le jumeau est mémorisé et n'est pas recréé lors du prochain import.

**Appareils déjà importés en double** (versions antérieures à 3.1.0) :

1. Dépliez *Paramètres → Doublons possibles*, **Rechercher les doublons**.
2. La liste affiche des groupes ayant la même adresse MAC. Le premier appareil de chaque groupe est la proposition qui est conservée.
3. Le bouton **→ dans « Nom de l'appareil cible »** sur une ligne fusionne cet appareil — ou **Appliquer toutes les suggestions** (cliquer deux fois pour confirmer) pour tous les groupes à la fois.

**Manuellement**, pour les appareils sans identifiant commun : sur la page de détail **Fusionner avec un autre appareil …**, recherchez et sélectionnez l'appareil cible, **Fusionner**.

Ce qui se passe lors de la fusion :

- L'appareil cible conserve toutes ses informations. L'application remplit les champs vides à partir de l'autre appareil, les remarques sont ajoutées.
- Les photos, photos d'installation, documents, l'historique des modifications et les sous-appareils passent à l'appareil cible.
- L'autre appareil part à la corbeille. Auparavant, l'application crée un instantané de la base de données — via *Paramètres → Instantanés de la base de données*, tout peut être restauré.

---

## Documentation d'assurance & succession — les workflows types

### Assurance

Le modèle *Assurance* de l'export PDF/Excel sélectionne automatiquement les champs qu'un assureur demande habituellement :

- N°, Type, Désignation, Modèle, Fabricant
- N° de série, AIN / N° d'article
- Date d'achat, Garantie jusqu'au, Emplacement, Remarques

Workflow :

1. Pour chaque appareil de valeur : prenez une photo, téléversez le justificatif d'achat comme document, renseignez les remarques avec le prix d'achat et, le cas échéant, une note pour l'assurance.
2. Une fois par an : *Paramètres → Exporter PDF / Excel → modèle Assurance*. Le PDF contient le tableau et une section de détail par appareil (les notes très longues sont tronquées à 1000 caractères avec un renvoi vers l'export Excel).
3. Excel en complément, si l'assureur retraite les données — Excel conserve la longueur complète des remarques dans une cellule.

### Succession

Le modèle *Succession* s'adresse aux proches — de quoi s'agit-il, où se trouve-t-il, la garantie court-elle encore, où sont les documents, fonctionne-t-il sans HA :

- N°, Type, Désignation, Fabricant, Modèle, N° de série, AIN / N° d'article
- Date d'achat, Garantie jusqu'au
- Emplacement, Étage
- Fonctionne sans HA + remarque
- Lien externe
- Fonction, Remarques

Les détails réseau (MAC, IP, firmware, intégration) n'y figurent volontairement plus depuis 3.0.0 — ils n'intéressent pas les héritiers et ne font qu'occuper de la largeur de colonne.

---

### Remise à une autre personne (démontage/électricien)

*Nouveau dans 3.0.0.* Le cas de figure : un jour, quelqu'un d'autre se retrouve devant l'installation — des proches, un électricien, un acheteur. Cette personne ne connaît ni Home Assistant ni l'historique de la maison.

Pour cela, chaque appareil dispose de deux champs, tout en bas du formulaire de modification, sous *Notes* :

**« Fonctionne sans Home Assistant ? »** — trois possibilités : *Inconnu* (par défaut, rien n'est exporté), *Oui, fonctionne sans HA*, *Non, nécessite HA*. Avec *Oui* ou *Non*, un champ de remarque apparaît en dessous pour une explication en clair : « interrupteur directement au mur », « thermostat réglable sur l'appareil », « impossible à utiliser sans HA ».

**« Interrupteur mural ponté ? »** (*nouveau dans 3.1.0*) — le point le plus important pour le démontage : si un interrupteur a été ponté pour cet appareil, la lampe ne fonctionne plus après le démontage. Trois possibilités (*Inconnu*, *Oui, interrupteur ponté ou découplé*, *Non*) et un champ de remarque : quel interrupteur, quelle boîte — ou quel réglage, car souvent rien n'est câblé différemment, c'est l'actionneur qui a été reconfiguré (p. ex. Shelly en mode « detached »). Apparaît sur la page de détail dans la même fiche que « Fonctionne sans HA ».

**« Lien externe »** — un renvoi vers un autre système : le document dans Paperless-ngx, la page du manuel du fabricant, une entrée dans votre wiki. Le lien figure sur la page de détail et s'ouvre dans une nouvelle fenêtre. Un simple nom comme `paperless.local/x` suffit, `https://` est ajouté automatiquement.

Le modèle d'export **« Démontage/électricien »** (Export → choisir un modèle) en fait la feuille à déposer dans le local technique :

- N°, Type, Désignation, Fabricant, Modèle
- Emplacement, Étage
- Réseau, Alimentation
- Fonctionne sans HA + remarque
- Interrupteur ponté + remarque
- Lien externe
- Fonction, Remarques

Volontairement **sans** numéros de série, dates d'achat ni garantie : c'est la liste qui peut traîner dans l'entrée, alors que les modèles Assurance et Succession contiennent les données complètes.

La colonne *Intégration* n'y figure plus depuis 3.0.0 — `fritz` ou `bosch_shc` sont des éléments internes de Home Assistant et ne disent rien à un artisan.

Le modèle **« Dossier d’urgence »** (*nouveau dans 3.1.0*) est le dossier pour le tableau électrique — pour l'électricien, le voisin ou l'agent immobilier que les proches appellent en cas d'urgence : appareil, étage et emplacement, fabricant, modèle, numéro de série, alimentation, fonctionne-sans-HA, interrupteurs pontés, date d'achat, garantie, lien vers la notice, fonction et remarques. Sans détails réseau. Les mots de passe n'y ont pas leur place — l'application n'en enregistre jamais ; une remarque indiquant où se trouvent les identifiants (gestionnaire de mots de passe, classeur) suffit.

**Tous les modèles comparés :**

| Modèle | Pour qui | Contenu |
|---|---|---|
| Assurance | Gestionnaire de sinistre | Appareil, numéro de série, date d'achat, garantie, emplacement, lien vers la facture |
| Démontage/électricien | Artisan sur place | Appareil, emplacement, réseau, alimentation, fonctionne-sans-HA, interrupteurs pontés, lien — sans données d'achat |
| Succession | Proches | Appareil, numéro de série, date d'achat, garantie, emplacement, fonctionne-sans-HA, lien |
| Dossier d’urgence | Personne appelée par les proches | Appareil, emplacement, numéro de série, alimentation, fonctionne-sans-HA, interrupteurs pontés, date d'achat, garantie, lien |

En PDF, tous les modèles produisent un tableau compact au format paysage, environ dix pages pour 300 appareils. Les pages de détail par appareil n'existent que si vous composez les champs à la main au lieu de choisir un modèle. Depuis 3.1.0, l'application mémorise votre sélection de champs sur le serveur — elle s'applique donc aussi sur le smartphone ou après l'effacement des données du navigateur.

**Ordre** (*nouveau dans 3.1.0*) : dans la boîte de dialogue d'export, vous pouvez choisir entre *Groupé par catégorie* (comportement précédent) et **Étage › Emplacement › Nom**. Pour la feuille du tableau électrique, la deuxième variante est la bonne : la personne devant le tableau cherche par pièce, pas par nom d'appareil. En Excel, elle produit un tableau continu sans lignes intermédiaires de catégorie, que vous pouvez trier et filtrer librement.

**Images dans le PDF** (*nouveau dans 3.1.0*) : sous *Images dans le PDF*, vous pouvez ajouter **Photos d’installation** et **Photos de l’appareil et documents image**. Les images figurent en annexe à la fin du PDF ; dans la liste, la colonne *Images* indique la référence pour chaque appareil (B1, B2 …). Une image rattachée à plusieurs appareils n'apparaît qu'une fois, avec tous les appareils concernés. Excel ne contient pas d'images.

---

## Filtres, recherche et tri

- La **recherche** en haut parcourt la désignation, le modèle, le fabricant, l'emplacement, la MAC, l'IP, le numéro de série, l'intégration, la fonction et le type.
- **Puces de catégorie** sous la recherche : les catégories intégrées n'apparaissent que si elles contiennent au moins 1 appareil ; les catégories personnalisées (issues de *Gérer les catégories*) apparaissent toujours depuis 3.1.0, de même que les types saisis librement. Un clic bascule entre *actif* et *inactif*. Un filtre actif reste visible même si le dernier appareil de cette catégorie disparaît — pour que vous puissiez le retirer.
- **Aperçu photo** : si un appareil a une photo, la liste l'affiche sous forme de petite vignette (depuis 3.1.0).
- Les **graphiques en anneau** et les **listes Top 10** du tableau de bord sont cliquables — un clic sur une barre de fabricant définit un filtre par fabricant et ouvre la liste des appareils.
- Les **puces de filtre** au-dessus de la liste (p. ex. « Par Fabricant : BOSCH × ») indiquent le filtre actif, le X le supprime.
- **Tri** : liste déroulante à droite. Options : Modifiés récemment (par défaut), Nom A→Z/Z→A, Type, Fabricant, Emplacement, Garantie bientôt expirée (expiration la plus proche en premier). Le choix est conservé pendant la session.
- **Bouton « Parents uniquement »** : masque les enfants (voir le chapitre sur les appareils multicanaux).

---

## Corbeille & instantanés de la base de données

### Corbeille

- Les appareils supprimés sont *soft-deleted* : restaurables pendant 30 jours dans *Paramètres → Corbeille*.
- Deux modes de restauration : par entrée (bouton sur chaque ligne) ou en masse (« Restaurer N » en haut à droite après sélection).
- *Supprimer définitivement* supprime l'appareil avec ses photos.
- Le bouton *Tout mettre à la corbeille* (paramètres, tout en bas) est conçu comme bouton de réinitialisation de dernier recours — il déplace tout l'inventaire dans la corbeille, avec instantané.

### Instantanés de la base de données

- Avant chaque action en masse (bulk-delete-all, recategorize, bulk-update), un instantané de la base de données SQLite est créé automatiquement.
- Liste sous *Paramètres → Instantanés de la base de données*. Pour chaque entrée : nom de fichier, opération, date, taille.
- *Restaurer* remplace la base de données actuelle par l'instantané — une « annulation de la dernière action ».

---

## Questions fréquentes (FAQ)

### « Mon add-on affiche 1500 appareils, alors que j'en ai seulement 200. »

Avant v2.5.2, l'import HA était exécuté plusieurs fois alors que MQTT-Discovery était actif. L'import réimportait alors les appareils publiés par le module complémentaire lui-même — le nombre d'appareils de l'inventaire doublait à chaque import. Correction :

1. Mettez à jour vers v2.5.2 au minimum.
2. L'appel serveur `POST /api/ha/cleanup-self-imports` déplace les doublons dans la corbeille. Aucun bouton ne le propose dans l'interface ; si vous préférez ne pas envoyer l'appel vous-même, ouvrez une issue ou écrivez à support@derregner.info.
3. Après 30 jours, ils sont supprimés. Si vous êtes pressé : videz la corbeille.

### « Je clique sur ‹ Téléverser un document › et j'arrive sur la page de détail sans que rien ne soit téléversé. »

Bug jusqu'à v2.5.3. Corrigé depuis v2.6.0 (`type="button"` sur les boutons, sinon ils soumettent le formulaire englobant). Mettez à jour.

### « Quand je clique sur ‹ Afficher dans HA ›, le navigateur s'ouvre et je dois me reconnecter à HA. »

Cela concernait l'application HA Companion sur smartphone jusqu'à v2.5.3. Depuis v2.6.0, le module complémentaire reconnaît le Companion à son user-agent et navigue dans la webview de l'application — retour via le bouton ou le geste Retour du système.

### « L'export PDF casse la mise en page pour un appareil avec de longues notes. »

Bug jusqu'à v2.5.3 (fpdf2 + en-tête personnalisé + saut de page multi_cell). Depuis v2.6.0, les notes de la section de détail sont tronquées à 1000 caractères avec la mention « ... — full text in Excel export ». Excel conserve le texte complet dans une cellule sans problème de mise en page.

### « Où la clé de licence est-elle stockée ? Que se passe-t-il lors d'une mise à jour de l'add-on ? »

La licence est enregistrée dans le dossier de données du module complémentaire sous `license.json` (géré par HA). Les mises à jour du module complémentaire la conservent. Réinstallation = nouvelle saisie nécessaire.

### « Quelles langues ? »

DE, EN, ES, FR, RU. Changement dans la vue des paramètres. La version Free est limitée à EN — Pro débloque toutes les langues.

---

## Résolution des problèmes

### Le navigateur bloque l'export (« Téléchargement non sécurisé bloqué »)

Cela se produit lorsque vous accédez à Home Assistant via une adresse non chiffrée, c'est-à-dire `http://<IP>:8123`. Les navigateurs ne téléchargent plus de fichiers depuis de telles pages sans demander confirmation. Cela n'a rien à voir avec l'application — l'export est généré et livré correctement.

**Pour obtenir le fichier :** dans la zone de téléchargement du navigateur, cliquez sur **Conserver**. Le fichier est complet et inchangé.

**Pour supprimer définitivement la demande :** accédez à Home Assistant via une connexion chiffrée — via Home Assistant Cloud (Nabu Casa), via un certificat propre avec Duck DNS et Let's Encrypt, ou via un reverse proxy en amont. Le problème ne se produit alors plus.

### Où se trouvent mes données, et comment les sauvegarder ?

Tout ce que l'application enregistre se trouve dans le répertoire de données du module complémentaire :

| Quoi | Où |
|---|---|
| Base de données avec tous les appareils | `/data/db/geraeteverwaltung.db` |
| Photos et photos d'installation | `/data/photos/` |
| Clé de licence | `/data/db/license.json` |

**Sauvegarder** ne demande aucune action manuelle : une sauvegarde Home Assistant inclut l'intégralité du répertoire de données du module complémentaire. Si vous souhaitez aussi conserver la liste des appareils en dehors de HA, utilisez *Paramètres → Exporter les Données → Export JSON* ou créez un instantané.

**N'écrivez pas** dans la base de données pendant que le module complémentaire fonctionne. L'ouvrir et la modifier via Samba ou SSH risque d'endommager le fichier — l'application le garde ouvert. Pour la consulter, arrêtez d'abord le module complémentaire.

### La connexion MQTT échoue

Dans *Paramètres → Intégration Home Assistant* se trouve **« Tester la connexion MQTT »**. Le bouton renvoie un message d'erreur précis, avec une indication selon le code d'erreur :

- **Code 4 / 5 / 135 (connexion refusée, « Not authorized »)** : les identifiants manquent ou sont incorrects. Pas à pas sous [Identifiants pour le broker MQTT](#identifiants-pour-le-broker-mqtt).
- **Connexion refusée** : le broker Mosquitto est-il démarré ? Port correct (1883 non chiffré, 8883 TLS) ?
- **Inaccessible / timeout** : hostname/IP correct ? Avec un broker externe : le réseau HA doit pouvoir atteindre le broker.
- **Erreur DNS** : vérifiez le champ `mqtt_host` dans les options du module complémentaire.

### L'import HA renvoie 502 Bad Gateway

Bug jusqu'à v2.5.2 — l'import durait plus longtemps que le timeout HTTP de l'Ingress HA. Depuis v2.5.3, l'import s'exécute en arrière-plan avec interrogation de la progression, plus de timeout.

### Rapport de diagnostic pour une issue GitHub

*Paramètres → Support et diagnostic* génère un rapport avec la version du module complémentaire, l'architecture, la version Python, l'état MQTT (sans identifiants), le nombre d'appareils et les 200 dernières lignes du journal. Les mots de passe, jetons, adresses IP et e-mails sont supprimés automatiquement. Transmission ou copie dans le presse-papiers d'un clic.

---

## Protection des données et mentions légales

**Où se trouvent les données :** toutes les données des appareils, photos et documents restent dans votre installation Home Assistant (répertoire de données du module complémentaire) et en plus dans le navigateur de chaque appareil avec lequel vous ouvrez l'application (pour le mode hors ligne). L'application ne contient ni suivi ni outils d'analyse.

**Ce que le module complémentaire envoie à l'extérieur :** uniquement la clé de licence avec l'identifiant d'installation au prestataire de paiement Lemon Squeezy — lors de l'activation et pour la vérification occasionnelle. Les données des appareils ne quittent votre installation que si vous exportez vous-même, envoyez un rapport de diagnostic ou publiez des appareils via MQTT sur votre propre broker.

**Garantie :** le logiciel est fourni sans garantie ; les conditions de licence du dépôt GitHub font foi.

---

## Support et contact

- **Signaler un bug ou demander une fonction :** [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) → *Issues*. Le plus rapide avec le rapport de diagnostic de *Paramètres → Support et diagnostic*.
- **Sans compte GitHub :** e-mail à support@derregner.info.
- **Échanger avec d'autres utilisateurs :** forum de la communauté simon42, fil « Geräteverwaltung ».

---

Version v3.1.0 · 2026-10-05. Les questions sans réponse ici sont les bienvenues sous forme d'issue sur GitHub ou par e-mail à support@derregner.info — le manuel est mis à jour à chaque version.
