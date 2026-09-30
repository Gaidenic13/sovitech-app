"""Between JSON values and the generated dataclasses (_generated.py).

``build`` turns a JSON value that already passed the validator into dataclasses and tuples;
``dump`` turns them back into JSON values. A JSON key and its attribute differ only by case
(``contentHash`` and ``content_hash``); the generator refuses any key for which the two do not
map back to each other. An optional field that is absent is ``None`` in Python and absent in
JSON again, so a value survives the round trip unchanged.
"""

from __future__ import annotations

import dataclasses
import re
from collections.abc import Mapping
from typing import Any

from . import _generated
from ._validate import Validator, definitions

_CAPITAL = re.compile(r"[A-Z]")
_UNDERSCORED = re.compile(r"_([a-z0-9])")


def snake_case(key: str) -> str:
    return _CAPITAL.sub(lambda match: "_" + match.group(0).lower(), key)


def camel_case(name: str) -> str:
    return _UNDERSCORED.sub(lambda match: match.group(1).upper(), name)


def build(def_name: str, value: Any, validator: Validator) -> Any:
    """Dataclasses and tuples from a JSON value that passed the validator for this def."""
    node = definitions()[def_name]
    if "oneOf" in node:
        return build(validator.branch_of(value, def_name), value, validator)
    if node.get("type") == "object":
        cls = getattr(_generated, def_name)
        properties: Mapping[str, Any] = node["properties"]
        return cls(
            **{
                snake_case(key): _build_node(properties[key], item, validator)
                for key, item in value.items()
            }
        )
    return _build_node(node, value, validator)


def _build_node(node: Mapping[str, Any], value: Any, validator: Validator) -> Any:
    if "$ref" in node:
        return build(node["$ref"].rsplit("/", 1)[1], value, validator)
    if node.get("type") == "array":
        return tuple(_build_node(node["items"], item, validator) for item in value)
    return value


def dump(value: Any) -> Any:
    """The JSON value of dataclasses and tuples (an absent optional field is left out)."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {
            camel_case(field.name): dump(getattr(value, field.name))
            for field in dataclasses.fields(value)
            if getattr(value, field.name) is not None
        }
    if isinstance(value, tuple | list):
        return [dump(item) for item in value]
    return value
