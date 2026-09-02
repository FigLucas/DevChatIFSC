import json
import os
import unittest
from unittest.mock import patch

from app.database import load_users
from app.passwords import hash_password, is_valid_password_hash, verify_password


class PasswordTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password = "uma-senha-longa-e-unica"
        cls.password_hash = hash_password(cls.password)

    def test_hashes_are_salted_and_verifiable(self):
        other_hash = hash_password(self.password)

        self.assertNotEqual(self.password_hash, other_hash)
        self.assertTrue(verify_password(self.password, self.password_hash))
        self.assertFalse(verify_password("senha-incorreta", self.password_hash))

    def test_rejects_malformed_hashes(self):
        self.assertFalse(is_valid_password_hash("invalido"))
        self.assertFalse(verify_password(self.password, "invalido"))


class UserConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = hash_password("outra-senha-longa-e-unica")

    def test_loads_valid_users_from_json(self):
        config = json.dumps(
            {
                "usuario.teste": {
                    "password_hash": self.password_hash,
                    "full_name": "Usuário Teste",
                    "disabled": False,
                }
            }
        )
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "development",
                "AUTH_USERS_JSON": config,
                "AUTH_USERS_FILE": "",
            },
            clear=True,
        ):
            users = load_users()

        self.assertEqual(users["usuario.teste"]["full_name"], "Usuário Teste")

    def test_requires_users_in_production(self):
        with (
            patch.dict(
                os.environ,
                {
                    "APP_ENV": "production",
                    "AUTH_USERS_JSON": "",
                    "AUTH_USERS_FILE": "",
                },
                clear=True,
            ),
            self.assertRaises(RuntimeError),
        ):
            load_users()

    def test_rejects_invalid_username(self):
        config = json.dumps(
            {"Admin": {"password_hash": self.password_hash, "disabled": False}}
        )
        with (
            patch.dict(
                os.environ,
                {
                    "APP_ENV": "development",
                    "AUTH_USERS_JSON": config,
                    "AUTH_USERS_FILE": "",
                },
                clear=True,
            ),
            self.assertRaises(RuntimeError),
        ):
            load_users()


if __name__ == "__main__":
    unittest.main()
